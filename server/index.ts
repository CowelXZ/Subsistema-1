import express from 'express';
import cors from 'cors';
// CORRECCIÓN 1: Agregamos .js al final (necesario para ESM/Vite)
import { getConnection, sql } from './database.js';
import rutasCargaAlumnos from './CargaAlumnosCSV.js';
import rutasCargaMaestros from './CargaMaestrosCSV.js';
import rutasCargaMaterias from './CargaMateriasCSV.js';
import rutasCargaHorarios from './CargaHorariosCSV.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.use('/api/csv/alumnos', rutasCargaAlumnos);
app.use('/api/csv/maestros', rutasCargaMaestros);
app.use('/api/csv/materias', rutasCargaMaterias);
app.use('/api/csv/horarios', rutasCargaHorarios);
// --- RUTAS (ENDPOINTS) ---

// 1. Prueba de conexión
app.get('/api/test', async (req, res) => {
    try {
        const pool = await getConnection();
        // Si pool es undefined, lanzamos error manual para que caiga en el catch
        if (!pool) throw new Error("No se pudo conectar a SQL Server");

        const result = await pool.request().query('SELECT GETDATE() as fecha');
        res.json(result.recordset[0]);
    } catch (error: any) { // CORRECCIÓN 2: Agregamos ': any' aquí
        res.status(500).send(error.message);
    }
});

// 2. Obtener lista de Carreras (VERSIÓN CORRECTA)
// 2. Obtener lista de Carreras (Desde Grupos con DISTINCT)
app.get('/api/carreras', async (req, res) => {
    try {
        const pool = await getConnection();
        if (!pool) throw new Error("Sin conexión a BD");

        const result = await pool.request().query(`
            SELECT 
                ROW_NUMBER() OVER (ORDER BY Carrera) AS idCarrera,
                Carrera AS NombreCarrera,
                Carrera AS Abreviatura
            FROM (
                SELECT DISTINCT Carrera
                FROM Grupos
                WHERE Activo = 1 AND Carrera IS NOT NULL AND Carrera != ''
            ) AS SubConsulta
        `);

        res.json(result.recordset);
    } catch (error: any) {
        console.error("Error en carreras:", error);
        res.status(500).send(error.message);
    }
});

// 3. Obtener lista de Áreas (Salones)
app.get('/api/areas', async (req, res) => {
    try {
        const pool = await getConnection();
        if (!pool) throw new Error("Sin conexión a BD");

        // Traemos solo las áreas que estén activas
        const result = await pool.request().query('SELECT idArea, Area, Observaciones FROM Areas WHERE Activo = 1');
        res.json(result.recordset);
    } catch (error: any) {
        console.error("Error cargando areas:", error);
        res.status(500).send(error.message);
    }
});

// 3. Buscar Usuario por Código (Usando SP)


// 4. NUEVO: Buscar Horario por ID y Fecha Actual
app.get('/api/horario/:idUsuario', async (req, res) => {
    try {
        const { idUsuario } = req.params;
        const pool = await getConnection();

        if (!pool) throw new Error("Sin conexión a BD");

        // Obtenemos la fecha y hora actual del servidor
        const fechaActual = new Date();

        const result = await pool.request()
            .input('idusuario', sql.Int, idUsuario)
            .input('horas', sql.DateTime, fechaActual) // Pasamos la hora actual al SP
            .execute('BuscarHorarioByUserAndDate');

        if (result.recordset.length > 0) {
            // El alumno tiene clase en este momento
            res.json(result.recordset[0]);
        } else {
            // No tiene clase asignada a esta hora
            res.json(null);
        }
    } catch (error: any) {
        console.error("Error buscando horario:", error);
        res.status(500).send(error.message);
    }
});

// Este endpoint maneja TANTO el escáner (datos crudos) COMO el formulario (datos formateados)
// 5. Buscar Usuario (EL ÚNICO Y PODEROSO HÍBRIDO)
// 5. Buscar Usuario (EL ÚNICO Y PODEROSO HÍBRIDO)
app.get('/api/usuarios/:matricula', async (req, res) => {
    try {
        const { matricula } = req.params;
        const pool = await getConnection();

        // 1. Buscamos los datos base del usuario
        const result = await pool?.request()
            .input('usuario', sql.VarChar, matricula)
            .execute('BuscarUsuario');

        if (result && result.recordset && result.recordset.length > 0) {
            const usuarioRaw = result.recordset[0];

            let fotoBase64 = null;
            if (usuarioRaw.Foto) {
                fotoBase64 = `data:image/jpeg;base64,${Buffer.from(usuarioRaw.Foto).toString('base64')}`;
            }

            let estadoAcceso = 'permitido';
            if (usuarioRaw.Status === 'DENEGADO') estadoAcceso = 'denegado';

            // --- NUEVO: BÚSQUEDA DE DATOS ESCOLARES (Grado, Grupo, Carrera) ---
            let gradoReal = '';
            let grupoReal = '';
            let carreraReal = '';

            if (usuarioRaw.idUsuario) {
                const queryAlumno = await pool?.request()
                    .input('idUsuario', sql.Int, usuarioRaw.idUsuario)
                    .query(`
                        SELECT 
                            G.Semestre AS GradoAlumno, 
                            G.Grupo AS GrupoAlumno, 
                            G.Carrera AS CarreraAlumno
                        FROM Alumnos A
                        INNER JOIN Grupos G ON A.idgrupo = G.idgrupo
                        WHERE A.idusuario = @idUsuario AND A.activo = 1
                    `);

                // Si encontramos su registro escolar, sobrescribimos las variables
                if (queryAlumno && queryAlumno.recordset.length > 0) {
                    const infoAlumno = queryAlumno.recordset[0];
                    if (infoAlumno.GradoAlumno) gradoReal = infoAlumno.GradoAlumno.toString();
                    if (infoAlumno.GrupoAlumno) grupoReal = infoAlumno.GrupoAlumno.trim();
                    if (infoAlumno.CarreraAlumno) carreraReal = infoAlumno.CarreraAlumno.trim();
                }
            }

            // 2. Construimos el objeto final mezclando datos personales y escolares
            const usuarioFormateado = {
                matricula: usuarioRaw.Usuario,
                nombres: usuarioRaw.Nombre,
                apellidoPaterno: usuarioRaw.ApellidoPaterno,
                apellidoMaterno: usuarioRaw.ApellidoMaterno,
                carrera: carreraReal || usuarioRaw.Puesto || '', // Da prioridad a la tabla Grupos
                grupo: grupoReal || '',                          // Da prioridad a la tabla Grupos
                grado: gradoReal,                                // Traído directamente de Grupos.Semestre
                sexo: usuarioRaw.Sexo === 1 ? 'M' : (usuarioRaw.Sexo === 2 ? 'F' : 'NB'),
                observaciones: usuarioRaw.Observaciones,
                foto: fotoBase64,
                statusAcceso: estadoAcceso
            };

            res.json({ ...usuarioRaw, ...usuarioFormateado });
        } else {
            res.status(404).json({ mensaje: 'Usuario no encontrado' });
        }
    } catch (error: any) {
        res.status(500).send(error.message);
    }
});

// Registrar Nuevo Usuario (Alumno/Administrativo)
// Registrar Nuevo Usuario (Alumno) - VERSIÓN NORMALIZADA
app.post('/api/usuarios/crear', async (req, res) => {
    try {
        const {
            matricula, nombres, apellidoPaterno, apellidoMaterno,
            grado, grupo, carrera, sexo, observaciones, fotoBase64, statusAcceso
        } = req.body;

        const pool = await getConnection();
        if (!pool) throw new Error("Sin conexión a BD");

        let fotoBuffer = null;
        if (fotoBase64) {
            const base64Data = fotoBase64.split(';base64,').pop();
            fotoBuffer = Buffer.from(base64Data, 'base64');
        }

        let sexoId = 1;
        if (sexo === 'F') sexoId = 2;
        if (sexo === 'NB') sexoId = 3;

        const statusBD = statusAcceso === 'denegado' ? 'DENEGADO' : 'ACCESO PERMITIDO';
        const semestreNum = parseInt(grado) || 1;

        // --- PASO 1: Guardar/Actualizar en tabla USUARIOS ---
        await pool.request()
            .input('autoridad', sql.VarChar, 'A')
            .input('usuario', sql.VarChar, matricula)
            .input('puesto', sql.VarChar, 'ALUMNO')          // <--- DATO CORRECTO
            .input('ubicacion', sql.VarChar, 'SIN ASIGNAR')  // <--- DATO CORRECTO
            .input('nombre', sql.VarChar, nombres)
            .input('apellidopaterno', sql.VarChar, apellidoPaterno)
            .input('apellidomaterno', sql.VarChar, apellidoMaterno || '')
            .input('foto', sql.VarBinary, fotoBuffer)
            .input('sexo', sql.TinyInt, sexoId)
            .input('activo', sql.TinyInt, 1)
            .input('status', sql.VarChar, statusBD)
            .input('fechacreacion', sql.DateTime, new Date())
            .input('observaciones', sql.VarChar, observaciones || '')
            .execute('RegistrarUsuarios');

        // --- PASO 2: Obtener el idUsuario de la persona que acabamos de afectar ---
        const userRes = await pool.request()
            .input('matricula', sql.VarChar, matricula)
            .query('SELECT idUsuario FROM Usuarios WHERE Usuario = @matricula');
        const idUsuario = userRes.recordset[0].idUsuario;

        // --- PASO 3: Lógica inteligente para Grupos (Buscar o Crear) ---
        const resultGrupo = await pool.request()
            .input('grupo', sql.Char, grupo)
            .input('semestre', sql.Int, semestreNum)
            .input('carrera', sql.VarChar, carrera)
            .query(`
                DECLARE @idgrupo INT;
                SELECT @idgrupo = idgrupo FROM Grupos WHERE Grupo = @grupo AND Semestre = @semestre AND Carrera = @carrera;

                -- Si el grupo no existe para esa carrera y semestre, lo creamos
                IF @idgrupo IS NULL
                BEGIN
                    INSERT INTO Grupos (Grupo, Salon, Carrera, Semestre, Activo)
                    VALUES (@grupo, 'POR ASIGNAR', @carrera, @semestre, 1);
                    SET @idgrupo = SCOPE_IDENTITY();
                END

                SELECT @idgrupo AS idgrupo;
            `);
        const idGrupo = resultGrupo.recordset[0].idgrupo;

        // --- PASO 4: Guardar/Actualizar en tabla ALUMNOS ---
        await pool.request()
            .input('matricula', sql.VarChar, matricula)
            .input('semestre', sql.Int, semestreNum)
            .input('idusuario', sql.Int, idUsuario)
            .input('idgrupo', sql.Int, idGrupo)
            .query(`
                IF EXISTS (SELECT 1 FROM Alumnos WHERE idusuario = @idusuario)
                BEGIN
                    -- Si ya es alumno, solo le actualizamos su grupo y semestre
                    UPDATE Alumnos
                    SET idgrupo = @idgrupo, Semestre = @semestre, activo = 1
                    WHERE idusuario = @idusuario;
                END
                ELSE
                BEGIN
                    -- Si es un alumno nuevo, lo insertamos
                    INSERT INTO Alumnos (Alumno, Semestre, idusuario, idgrupo, activo)
                    VALUES (@matricula, @semestre, @idusuario, @idgrupo, 1);
                END
            `);

        res.status(200).json({ mensaje: 'Alumno guardado y vinculado exitosamente' });

    } catch (error: any) {
        console.error("Error al guardar alumno completo:", error);
        res.status(500).send(error.message);
    }
});

// 6. Registrar Nuevo Maestro y sus Horarios (VERSIÓN SIMPLIFICADA SIN CARRERA/SALON)
app.post('/api/maestros/crear', async (req, res) => {
    try {
        const {
            numeroEmpleado, nombres, apellidoPaterno, apellidoMaterno,
            gradoAcademico, correo, sexo, observaciones,
            fotoBase64,
            horario
        } = req.body;

        const pool = await getConnection();
        if (!pool) throw new Error("Sin conexión a BD");

        // --- PASO 1: Procesar la Foto ---
        let fotoBuffer = null;
        if (fotoBase64) {
            const base64Data = fotoBase64.split(';base64,').pop();
            fotoBuffer = Buffer.from(base64Data, 'base64');
        }

        let valorSexo = 'No Binario';
        if (sexo === 'M') valorSexo = 'Masculino';
        if (sexo === 'F') valorSexo = 'Femenino';

        // --- PASO 2: Guardar Maestro ---
        const resultMaestro = await pool.request()
            .input('matricula', sql.VarChar, numeroEmpleado)
            .input('nombre', sql.VarChar, nombres)
            .input('apellidoPaterno', sql.VarChar, apellidoPaterno)
            .input('apellidoMaterno', sql.VarChar, apellidoMaterno || '')
            .input('gradoAcademico', sql.VarChar, '')
            .input('sexo', sql.VarChar, valorSexo)
            .input('correo', sql.VarChar, correo || '')
            .input('foto', sql.VarBinary, fotoBuffer)
            .execute('RegistrarMaestro');

        const idMaestroGenerado = resultMaestro.recordset[0].idMaestro;

        // --- PASO 3: Guardar el Horario (CON FORMATO UNIVERSAL) ---
        if (horario && horario.length > 0) {
            for (const clase of horario) {
                // Usamos el formato YYYYMMDD que es el estándar más seguro en SQL Server
                const horaInicioStr = `19000101 ${clase.horaInicio}:00`;
                const horaFinStr = `19000101 ${clase.horaFin}:00`;

                await pool.request()
                    .input('idMaestro', sql.Int, idMaestroGenerado)
                    .input('materia', sql.VarChar, clase.materia)
                    .input('hora_inicio', sql.VarChar, horaInicioStr)
                    .input('hora_fin', sql.VarChar, horaFinStr)
                    .input('grupo', sql.Char, clase.grupo || 'A')
                    .input('semestre', sql.Int, parseInt(clase.semestre) || 1)
                    .input('lunes', sql.TinyInt, clase.dias.includes('L') ? 1 : 0)
                    .input('martes', sql.TinyInt, clase.dias.includes('M') ? 1 : 0)
                    .input('miercoles', sql.TinyInt, clase.dias.includes('MM') ? 1 : 0)
                    .input('jueves', sql.TinyInt, clase.dias.includes('J') ? 1 : 0)
                    .input('viernes', sql.TinyInt, clase.dias.includes('V') ? 1 : 0)
                    .input('idarea', sql.Int, parseInt(clase.idarea) || 1)
                    .input('salon', sql.VarChar, clase.salon || '')
                    .input('carrera', sql.VarChar, clase.carrera || '')
                    .execute('RegistrarHorarioWeb');
            }
        }

        res.json({ mensaje: 'Maestro y horario registrados correctamente.' });

    } catch (error: any) {
        console.error("Error al registrar maestro completo:", error);
        res.status(500).send(error.message);
    }
});

// 6.1 Obtener lista de Semestres existentes en la tabla Grupos
// 1. Semestres corregido (Elimina el 0 y nulos)
app.get('/api/semestres', async (req, res) => {
    try {
        const pool = await getConnection();
        const result = await pool.request().query(`
            SELECT DISTINCT Semestre 
            FROM Grupos 
            WHERE Activo = 1 AND Semestre > 0 
            ORDER BY Semestre ASC
        `);
        res.json(result.recordset);
    } catch (error: any) { res.status(500).send(error.message); }
});

// 6.2 NUEVO: Letras de Grupo (A, B, C...) dinámicas
app.get('/api/grupos-letras', async (req, res) => {
    try {
        const pool = await getConnection();
        const result = await pool.request().query(`
            SELECT DISTINCT Grupo 
            FROM Grupos 
            WHERE Activo = 1 AND Grupo IS NOT NULL AND Grupo <> ''
            ORDER BY Grupo ASC
        `);
        res.json(result.recordset);
    } catch (error: any) { res.status(500).send(error.message); }
});

// Registrar Nuevo Usuario (Alumno/Administrativo)
app.post('/api/usuarios/crear', async (req, res) => {
    try {
        const {
            matricula, nombres, apellidoPaterno, apellidoMaterno,
            grado, grupo, carrera, sexo, observaciones, fotoBase64
        } = req.body;

        const pool = await getConnection();
        if (!pool) throw new Error("Sin conexión a BD");

        // 1. Convertir la foto de Base64 a Buffer (Binario para SQL)
        let fotoBuffer = null;
        if (fotoBase64) {
            const base64Data = fotoBase64.split(';base64,').pop();
            fotoBuffer = Buffer.from(base64Data, 'base64');
        }

        // 2. Mapear el Sexo a tinyint (Como lo definiste en tu tabla Usuarios)
        let sexoId = 1; // Default: Masculino
        if (sexo === 'F') sexoId = 2; // Femenino
        if (sexo === 'NB') sexoId = 3; // No Binario

        // 3. Ejecutar el Stored Procedure
        await pool.request()
            .input('autoridad', sql.VarChar, 'A') // 'A' de Alumno (Cámbialo si manejas otros roles en esta vista)
            .input('usuario', sql.VarChar, matricula)
            .input('puesto', sql.VarChar, carrera) // Usamos 'Puesto' para guardar la carrera según tu lógica
            .input('ubicacion', sql.VarChar, grupo) // Guardamos el grupo en 'Ubicacion'
            .input('nombre', sql.VarChar, nombres)
            .input('apellidopaterno', sql.VarChar, apellidoPaterno)
            .input('apellidomaterno', sql.VarChar, apellidoMaterno || '')
            .input('foto', sql.VarBinary, fotoBuffer)
            .input('sexo', sql.TinyInt, sexoId)
            .input('activo', sql.TinyInt, 1) // 1 = Activo
            .input('status', sql.VarChar, 'ACCESO PERMITIDO') // Status inicial
            .input('fechacreacion', sql.DateTime, new Date()) // El SP lo pide en la firma, aunque lo reescriba internamente
            .input('observaciones', sql.VarChar, observaciones || '')
            .execute('RegistrarUsuarios');

        res.status(200).json({ mensaje: 'Usuario registrado exitosamente' });

    } catch (error: any) {
        console.error("Error al guardar usuario:", error);
        res.status(500).send(error.message);
    }
});

//6.3 // Buscar maestro y todo su horario por Matrícula (Usando Stored Procedure)
app.get('/api/maestros/buscar/:matricula', async (req, res) => {
    try {
        const pool = await getConnection();
        if (!pool) throw new Error("Sin conexión");

        const { matricula } = req.params;

        // 1. Buscamos los datos principales del maestro (AGREGAMOS LA COLUMNA "Foto")
        const maestroResult = await pool.request()
            .input('matricula', sql.VarChar, matricula)
            .query(`
                SELECT idMaestro, Nombre, ApellidoPaterno, ApellidoMaterno, Correo, Sexo, Foto 
                FROM Maestros 
                WHERE Matricula = @matricula AND Activo = 1
            `);

        if (maestroResult.recordset.length === 0) {
            return res.status(404).json({ message: "No encontrado" });
        }

        const maestro = maestroResult.recordset[0];

        // --- CONVERSIÓN DE FOTO ---
        // SQL Server guarda la foto como un Buffer (binario). React necesita un texto Base64.
        let fotoBase64 = null;
        if (maestro.Foto) {
            fotoBase64 = `data:image/jpeg;base64,${maestro.Foto.toString('base64')}`;
        }

        // 2. Ejecutamos tu nuevo Procedimiento Almacenado para traer el horario
        const materiasResult = await pool.request()
            .input('matricula', sql.VarChar, matricula)
            .execute('BuscarHorarioMaestroWeb'); // <-- ¡Aquí llamamos al SP!

        // Devolvemos el paquete completo a React
        res.json({
            maestro: {
                ...maestro,
                Foto: fotoBase64 // Sobrescribimos la foto original con la versión convertida
            },
            materias: materiasResult.recordset
        });

    } catch (error: any) {
        res.status(500).send(error.message);
    }
});

// Registrar Nuevo Usuario (Alumno/Administrativo)
app.post('/api/usuarios/crear', async (req, res) => {
    try {
        const {
            matricula, nombres, apellidoPaterno, apellidoMaterno,
            grado, grupo, carrera, sexo, observaciones, fotoBase64
        } = req.body;

        const pool = await getConnection();
        if (!pool) throw new Error("Sin conexión a BD");

        // 1. Convertir la foto de Base64 a Buffer (Binario para SQL)
        let fotoBuffer = null;
        if (fotoBase64) {
            const base64Data = fotoBase64.split(';base64,').pop();
            fotoBuffer = Buffer.from(base64Data, 'base64');
        }

        // 2. Mapear el Sexo a tinyint (Como lo definiste en tu tabla Usuarios)
        let sexoId = 1; // Default: Masculino
        if (sexo === 'F') sexoId = 2; // Femenino
        if (sexo === 'NB') sexoId = 3; // No Binario

        // 3. Ejecutar el Stored Procedure
        await pool.request()
            .input('autoridad', sql.VarChar, 'A') // 'A' de Alumno (Cámbialo si manejas otros roles en esta vista)
            .input('usuario', sql.VarChar, matricula)
            .input('puesto', sql.VarChar, carrera) // Usamos 'Puesto' para guardar la carrera según tu lógica
            .input('ubicacion', sql.VarChar, grupo) // Guardamos el grupo en 'Ubicacion'
            .input('nombre', sql.VarChar, nombres)
            .input('apellidopaterno', sql.VarChar, apellidoPaterno)
            .input('apellidomaterno', sql.VarChar, apellidoMaterno || '')
            .input('foto', sql.VarBinary, fotoBuffer)
            .input('sexo', sql.TinyInt, sexoId)
            .input('activo', sql.TinyInt, 1) // 1 = Activo
            .input('status', sql.VarChar, 'ACTIVO')
            .input('fechacreacion', sql.DateTime, new Date()) // El SP lo pide en la firma, aunque lo reescriba internamente
            .input('observaciones', sql.VarChar, observaciones || '')
            .execute('RegistrarUsuarios');

        res.status(200).json({ mensaje: 'Usuario registrado exitosamente' });

    } catch (error: any) {
        console.error("Error al guardar usuario:", error);
        res.status(500).send(error.message);
    }
});

// 7. Obtener lista de Materias Activas sin repetir
app.get('/api/materias', async (req, res) => {
    try {
        const pool = await getConnection();
        if (!pool) throw new Error("No hay conexión");

        // Usamos DISTINCT para que si 3 maestros dan "E-COMMERCE", solo salga una vez en la lista
        const result = await pool.request().query(`
            SELECT DISTINCT Materia 
            FROM Asignaturas 
            WHERE activo = 1 
            ORDER BY Materia ASC
        `);

        res.json(result.recordset);
    } catch (error: any) {
        res.status(500).send(error.message);
    }
});

// =====================================================================
// ENDPOINTS PARA ASIGNACIÓN DE CARGA (Usando Horarios y Periodos)
// =====================================================================

// 8. Obtener Carga Académica (El JOIN de las 3 tablas + Grupos)
app.get('/api/maestros/carga', async (req, res) => {
    try {
        const pool = await getConnection();
        if (!pool) throw new Error("Sin conexión a BD");

        // 1. Maestros (AHORA TRAEMOS A TODOS, ACTIVOS E INACTIVOS)
        const maestrosResult = await pool.request().query('SELECT idMaestro, Nombre, ApellidoPaterno, ApellidoMaterno, Foto, Activo FROM Maestros');
        const maestros = maestrosResult.recordset;

        // 2. Traer las clases uniendo Asignaturas + Horarios + Periodos + Grupos
        const clasesResult = await pool.request().query(`
            SELECT 
                A.idasignatura as id, 
                A.idMaestro, 
                A.Materia as materia, 
                CONVERT(varchar(5), P.hora_inicio, 108) as horaInicio, 
                CONVERT(varchar(5), P.hora_fin, 108) as horaFin,
                P.lunes, P.martes, P.miercoles, P.jueves, P.viernes,
                G.Carrera as carrera,
                G.Salon as salon,
                G.Semestre as semestre,
                G.Grupo as grupo
            FROM Asignaturas A
            INNER JOIN Horarios H ON A.idasignatura = H.idasignatura
            INNER JOIN Periodos P ON H.idperiodo = P.idperiodo
            LEFT JOIN Grupos G ON A.idgrupo = G.idgrupo
            WHERE A.idMaestro IS NOT NULL
        `);
        const clasesRaw = clasesResult.recordset;

        // 3. Formatear para React (Añadimos los nuevos campos)
        const payload = maestros.map(m => {
            let fotoBase64 = "https://i.pravatar.cc/150?u=" + m.idMaestro;
            if (m.Foto) fotoBase64 = `data:image/jpeg;base64,${Buffer.from(m.Foto).toString('base64')}`;

            const nombreCompleto = `${m.Nombre} ${m.ApellidoPaterno} ${m.ApellidoMaterno || ''}`.trim();

            const clasesDelMaestro = clasesRaw.filter(c => c.idMaestro === m.idMaestro).map(c => {
                const dias = [];
                if (c.lunes === 1) dias.push('L');
                if (c.martes === 1) dias.push('M');
                if (c.miercoles === 1) dias.push('MM');
                if (c.jueves === 1) dias.push('J');
                if (c.viernes === 1) dias.push('V');

                return {
                    id: c.id,
                    materia: c.materia,
                    horaInicio: c.horaInicio,
                    horaFin: c.horaFin,
                    dias: dias,
                    carrera: c.carrera || 'N/A',
                    salon: c.salon || 'N/A',
                    semestre: c.semestre || '-',
                    grupo: c.grupo || '-'
                };
            });

            return {
                id: m.idMaestro,
                nombre: nombreCompleto,
                foto: fotoBase64,
                activo: m.Activo === 1, // <--- NUEVO: Le dice a Figma si es verde o gris
                clases: clasesDelMaestro
            };
        });

        res.json(payload);
    } catch (error: any) {
        console.error("Error en /api/maestros/carga:", error);
        res.status(500).send(error.message);
    }
});

// 9. Agregar materia (Ahora usando el Stored Procedure 'RegistrarHorarioWeb')
app.post('/api/maestros/agregar-materia', async (req, res) => {
    try {
        const { idMaestro, materia, horaInicio, horaFin, dias, idarea, semestre, grupo, carrera, salon } = req.body;
        const pool = await getConnection();

        const lunes = dias.includes('L') ? 1 : 0;
        const martes = dias.includes('M') ? 1 : 0;
        const miercoles = dias.includes('MM') ? 1 : 0;
        const jueves = dias.includes('J') ? 1 : 0;
        const viernes = dias.includes('V') ? 1 : 0;

        // Formateo de horas para SQL Server
        const horaInicioStr = `1900-01-01 ${horaInicio}:00.000`;
        const horaFinStr = `1900-01-01 ${horaFin}:00.000`;

        await pool.request()
            .input('idMaestro', sql.Int, idMaestro)
            .input('materia', sql.VarChar, materia)
            .input('hora_inicio', sql.VarChar, horaInicioStr)
            .input('hora_fin', sql.VarChar, horaFinStr)
            .input('grupo', sql.Char, grupo)
            .input('semestre', sql.Int, parseInt(semestre))
            .input('lunes', sql.TinyInt, lunes)
            .input('martes', sql.TinyInt, martes)
            .input('miercoles', sql.TinyInt, miercoles)
            .input('jueves', sql.TinyInt, jueves)
            .input('viernes', sql.TinyInt, viernes)
            .input('idarea', sql.Int, parseInt(idarea) || 1)
            .input('salon', sql.VarChar, salon)
            .input('carrera', sql.VarChar, carrera)
            .execute('RegistrarHorarioWeb'); // Llamada al nuevo procedure

        res.json({ mensaje: "Materia guardada correctamente y optimizada" });
    } catch (error: any) {
        console.error(error);
        res.status(500).send(error.message);
    }
});

// 10. Eliminar materia
app.delete('/api/maestros/eliminar-materia/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await getConnection();

        // MUY IMPORTANTE: Se borra primero de Horarios (la tabla hija) y luego de Asignaturas (la padre)
        await pool.request()
            .input('id', sql.Int, id)
            .query(`
                DELETE FROM Horarios WHERE idasignatura = @id;
                DELETE FROM Asignaturas WHERE idasignatura = @id;
            `);

        res.json({ mensaje: "Materia eliminada" });
    } catch (error: any) {
        res.status(500).send(error.message);
    }
});

// 11. Editar materia (UPDATE)
app.put('/api/maestros/editar-materia/:id', async (req, res) => {
    try {
        const idAsignatura = req.params.id;
        // Recibimos los nuevos datos editados desde el frontend
        const { materia, horaInicio, horaFin, dias, semestre, grupo, carrera, salon } = req.body;
        const pool = await getConnection();

        const lunes = dias.includes('L') ? 1 : 0;
        const martes = dias.includes('M') ? 1 : 0;
        const miercoles = dias.includes('MM') ? 1 : 0;
        const jueves = dias.includes('J') ? 1 : 0;
        const viernes = dias.includes('V') ? 1 : 0;

        const horaInicioStr = `1900-01-01 ${horaInicio}:00.000`;
        const horaFinStr = `1900-01-01 ${horaFin}:00.000`;

        await pool.request()
            .input('idAsignatura', sql.Int, idAsignatura)
            .input('materia', sql.VarChar, materia)
            .input('semestre', sql.Int, parseInt(semestre))
            .input('grupo', sql.Char, grupo)
            .input('carrera', sql.VarChar, carrera)
            .input('salon', sql.VarChar, salon)
            .input('horaInicio', sql.VarChar, horaInicioStr)
            .input('horaFin', sql.VarChar, horaFinStr)
            .input('lunes', sql.TinyInt, lunes)
            .input('martes', sql.TinyInt, martes)
            .input('miercoles', sql.TinyInt, miercoles)
            .input('jueves', sql.TinyInt, jueves)
            .input('viernes', sql.TinyInt, viernes)
            .query(`
                -- 1. Lógica inteligente para el Grupo (Misma que al insertar)
                DECLARE @idgrupo INT;
                SELECT @idgrupo = idgrupo FROM Grupos WHERE Grupo = @grupo AND Semestre = @semestre AND Carrera = @carrera;

                IF @idgrupo IS NULL
                BEGIN
                    INSERT INTO Grupos (Grupo, Salon, Carrera, Semestre, Activo)
                    VALUES (@grupo, @salon, @carrera, @semestre, 1);
                    SET @idgrupo = SCOPE_IDENTITY();
                END
                ELSE
                BEGIN
                    UPDATE Grupos SET Salon = @salon WHERE idgrupo = @idgrupo;
                END

                -- 2. Actualizamos el nombre de la materia y su nuevo grupo
                UPDATE Asignaturas 
                SET Materia = @materia, idgrupo = @idgrupo 
                WHERE idasignatura = @idAsignatura;

                -- 3. Buscamos el Periodo enlazado y le actualizamos las horas/días
                DECLARE @idperiodo INT;
                SELECT @idperiodo = idperiodo FROM Horarios WHERE idasignatura = @idAsignatura;

                IF @idperiodo IS NOT NULL
                BEGIN
                    UPDATE Periodos
                    SET hora_inicio = @horaInicio, hora_fin = @horaFin,
                        lunes = @lunes, martes = @martes, miercoles = @miercoles, jueves = @jueves, viernes = @viernes
                    WHERE idperiodo = @idperiodo;
                END
            `);

        res.json({ mensaje: "Materia actualizada correctamente" });
    } catch (error: any) {
        console.error(error);
        res.status(500).send(error.message);
    }
});

// 12. Cambiar estado ACTIVO/INACTIVO de un Maestro y sus Materias
app.put('/api/maestros/estado/:idMaestro', async (req, res) => {
    try {
        const { idMaestro } = req.params;
        const { estado } = req.body; // Recibirá 1 (Activo) o 0 (Inactivo)
        const pool = await getConnection();

        // Actualizamos ambas tablas al mismo tiempo para mantener sincronía
        await pool.request()
            .input('id', sql.Int, idMaestro)
            .input('estado', sql.TinyInt, estado)
            .query(`
                -- 1. Actualiza la tarjeta del maestro
                UPDATE Maestros SET Activo = @estado WHERE idMaestro = @id;
                
                -- 2. Actualiza masivamente sus materias en la tabla Asignaturas
                UPDATE Asignaturas SET activo = @estado WHERE idMaestro = @id;
            `);

        res.json({ mensaje: "Estado actualizado correctamente en Maestros y Asignaturas" });
    } catch (error: any) {
        console.error(error);
        res.status(500).send(error.message);
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Backend corriendo en http://localhost:${PORT}`);
});