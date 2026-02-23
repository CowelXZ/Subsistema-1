import express from 'express';
import cors from 'cors';
// CORRECCIÓN 1: Agregamos .js al final (necesario para ESM/Vite)
import { getConnection, sql } from './database.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));

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

// 2. Obtener lista de Carreras
app.get('/api/carreras', async (req, res) => {
    try {
        const pool = await getConnection();
        if (!pool) throw new Error("No hay conexión");

        const result = await pool.request().query('SELECT * FROM Carreras WHERE Activo = 1');
        res.json(result.recordset);
    } catch (error: any) { // CORRECCIÓN 2: Agregamos ': any' aquí
        res.status(500).send(error.message);
    }
});


// 3. Buscar Usuario por Código (Usando SP)
app.get('/api/usuarios/:codigo', async (req, res) => {
    try {
        const { codigo } = req.params;
        const pool = await getConnection();
        
        if (!pool) throw new Error("Sin conexión a BD");

        // EJECUTAMOS EL STORED PROCEDURE 'BuscarUsuario'
        const result = await pool.request()
            .input('usuario', sql.VarChar, codigo) // El nombre del parámetro debe coincidir con el del SP (@usuario)
            .execute('BuscarUsuario');

        if (result.recordset.length > 0) {
            const usuario = result.recordset[0];

            // --- CONVERSIÓN DE FOTO (Igual que antes) ---
            if (usuario.Foto) {
                const base64Image = Buffer.from(usuario.Foto).toString('base64');
                usuario.Foto = `data:image/jpeg;base64,${base64Image}`;
            }

            res.json(usuario);
        } else {
            res.status(404).json({ message: 'Usuario no encontrado' });
        }
    } catch (error: any) {
        console.error("Error en SP BuscarUsuario:", error);
        res.status(500).send(error.message);
    }
});

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

// 5. Buscar Usuario (EL ÚNICO Y PODEROSO HÍBRIDO)
// Este endpoint maneja TANTO el escáner (datos crudos) COMO el formulario (datos formateados)
app.get('/api/usuarios/:matricula', async (req, res) => {
    try {
        const { matricula } = req.params;
        const pool = await getConnection();

        const result = await pool?.request()
            .input('usuario', sql.VarChar, matricula)
            .execute('BuscarUsuario');

        // Validamos que exista resultado
        if (result && result.recordset && result.recordset.length > 0) {
            // Obtenemos el objeto crudo de la BD (Con mayúsculas: Nombre, Usuario...)
            const usuarioRaw = result.recordset[0];

            // 1. Procesamos la foto para que sirva en ambos casos
            let fotoBase64 = null;
            if (usuarioRaw.Foto) {
                fotoBase64 = `data:image/jpeg;base64,${Buffer.from(usuarioRaw.Foto).toString('base64')}`;
            }

            // Actualizamos el objeto crudo con la foto en Base64 (Para el Escáner)
            usuarioRaw.Foto = fotoBase64;

            // 2. Preparamos el objeto mapeado (Para el Formulario)
            const usuarioFormateado = {
                matricula: usuarioRaw.Usuario,
                nombres: usuarioRaw.Nombre,
                apellidoPaterno: usuarioRaw.ApellidoPaterno,
                apellidoMaterno: usuarioRaw.ApellidoMaterno,
                carrera: usuarioRaw.Puesto,
                sexo: usuarioRaw.Sexo === 1 ? 'M' : (usuarioRaw.Sexo === 2 ? 'F' : 'NB'),
                observaciones: usuarioRaw.Observaciones,
                foto: fotoBase64
            };

            // 3. ¡FUSIÓN! Devolvemos TODO junto. 
            // React tomará lo que necesite y el Escáner tomará lo suyo.
            res.json({
                ...usuarioRaw,       // Aquí van: Nombre, Puesto, Usuario... (Para el Escáner)
                ...usuarioFormateado // Aquí van: nombres, carrera, matricula... (Para el Formulario)
            });

        } else {
            res.status(404).json({ mensaje: 'Usuario no encontrado' });
        }

    } catch (error: any) {
        console.error(error);
        res.status(500).send(error.message);
    }
});

// 6. Registrar Nuevo Maestro y sus Horarios (INSERT)
app.post('/api/maestros/crear', async (req, res) => {
    try {
        const {
            numeroEmpleado, nombres, apellidoPaterno, apellidoMaterno,
            gradoAcademico, correo, sexo, observaciones,
            fotoBase64,
            horario // Arreglo con las materias asignadas
        } = req.body;

        const pool = await getConnection();
        if (!pool) throw new Error("Sin conexión a BD");

        // Convertir Base64 a Binario
        let fotoBuffer = null;
        if (fotoBase64) {
            const base64Data = fotoBase64.split(';base64,').pop();
            fotoBuffer = Buffer.from(base64Data, 'base64');
        }

// Convertir 'M' o 'F' a texto completo para que se vea bien en la tabla
        let valorSexo = 'No Binario';
        if (sexo === 'M') valorSexo = 'Masculino';
        if (sexo === 'F') valorSexo = 'Femenino';

        // PASO 1: Guardar al Maestro en la NUEVA tabla 'Maestros'
        await pool.request()
            .input('matricula', sql.VarChar, numeroEmpleado)
            .input('nombre', sql.VarChar, nombres)
            .input('apellidoPaterno', sql.VarChar, apellidoPaterno)
            .input('apellidoMaterno', sql.VarChar, apellidoMaterno || '')
            .input('gradoAcademico', sql.VarChar, gradoAcademico || 'Licenciatura')
            .input('sexo', sql.VarChar, valorSexo)
            .input('correo', sql.VarChar, correo || '')
            .input('foto', sql.VarBinary, fotoBuffer)
            .execute('RegistrarMaestro');

        // PASO 2: Guardar las materias en el Horario
        const nombreCompletoMaestro = `${nombres} ${apellidoPaterno} ${apellidoMaterno || ''}`.trim().toUpperCase();

        if (horario && horario.length > 0) {
            for (const clase of horario) {
                const lunes = clase.dias.includes('L') ? 1 : 0;
                const martes = clase.dias.includes('M') ? 1 : 0;
                const miercoles = clase.dias.includes('X') ? 1 : 0;
                const jueves = clase.dias.includes('J') ? 1 : 0;
                const viernes = clase.dias.includes('V') ? 1 : 0;

                // SOLUCIÓN ZONA HORARIA: Forzamos el formato estricto de SQL Server (Año 1900)
                // y lo enviamos como cadena de texto (VarChar) para evitar que Node.js lo altere.
                const horaInicioStr = `1900-01-01 ${clase.horaInicio}:00.000`;
                const horaFinStr = `1900-01-01 ${clase.horaFin}:00.000`;

                await pool.request()
                    .input('maestro', sql.VarChar, nombreCompletoMaestro)
                    .input('materia', sql.VarChar, clase.materia)
                    .input('hora_inicio', sql.VarChar, horaInicioStr) // <--- Cambio clave
                    .input('hora_fin', sql.VarChar, horaFinStr)       // <--- Cambio clave
                    .input('grupo', sql.Char, clase.grupo) 
                    .input('semestre', sql.Int, parseInt(clase.semestre)) 
                    .input('lunes', sql.TinyInt, lunes)
                    .input('martes', sql.TinyInt, martes)
                    .input('miercoles', sql.TinyInt, miercoles)
                    .input('jueves', sql.TinyInt, jueves)
                    .input('viernes', sql.TinyInt, viernes)
                    .input('idarea', sql.Int, parseInt(clase.idarea) || 1) 
                    .input('salon', sql.VarChar, clase.salon) 
                    .input('carrera', sql.VarChar, clase.carrera) 
                    .execute('RegistrarHorarioCSV');
            }
        }

        res.json({ mensaje: 'Maestro y horario registrados con éxito' });

    } catch (error: any) {
        console.error(error);
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

// 8. Obtener Carga Académica (El JOIN de las 3 tablas)
app.get('/api/maestros/carga', async (req, res) => {
    try {
        const pool = await getConnection();
        if (!pool) throw new Error("Sin conexión a BD");

        // 1. Maestros activos
        const maestrosResult = await pool.request().query('SELECT idMaestro, Nombre, ApellidoPaterno, ApellidoMaterno, Foto FROM Maestros WHERE Activo = 1');
        const maestros = maestrosResult.recordset;

        // 2. Traer las clases uniendo Asignaturas + Horarios + Periodos
        const clasesResult = await pool.request().query(`
            SELECT 
                A.idasignatura as id, 
                A.idMaestro, 
                A.Materia as materia, 
                CONVERT(varchar(5), P.hora_inicio, 108) as horaInicio, 
                CONVERT(varchar(5), P.hora_fin, 108) as horaFin,
                P.lunes, P.martes, P.miercoles, P.jueves, P.viernes 
            FROM Asignaturas A
            INNER JOIN Horarios H ON A.idasignatura = H.idasignatura
            INNER JOIN Periodos P ON H.idperiodo = P.idperiodo
            WHERE A.idMaestro IS NOT NULL
        `);
        const clasesRaw = clasesResult.recordset;

        // 3. Formatear para React
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
                    dias: dias
                };
            });

            return {
                id: m.idMaestro,
                nombre: nombreCompleto,
                foto: fotoBase64,
                clases: clasesDelMaestro
            };
        });

        res.json(payload);
    } catch (error: any) {
        console.error("Error en /api/maestros/carga:", error);
        res.status(500).send(error.message);
    }
});

// 9. Agregar materia (Inserción en cadena)
app.post('/api/maestros/agregar-materia', async (req, res) => {
    try {
        const { idMaestro, materia, horaInicio, horaFin, dias, idarea } = req.body;
        const pool = await getConnection();
        
        const lunes = dias.includes('L') ? 1 : 0;
        const martes = dias.includes('M') ? 1 : 0;
        const miercoles = dias.includes('MM') ? 1 : 0;
        const jueves = dias.includes('J') ? 1 : 0;
        const viernes = dias.includes('V') ? 1 : 0;

        const horaInicioStr = `1900-01-01 ${horaInicio}:00.000`;
        const horaFinStr = `1900-01-01 ${horaFin}:00.000`;

        // PASO 1: Insertar Asignatura y obtener su ID generado
        const resultAsig = await pool.request()
            .input('idMaestro', sql.Int, idMaestro)
            .input('materia', sql.VarChar, materia)
            .query(`
                INSERT INTO Asignaturas (idMaestro, Materia, activo, idgrupo)
                OUTPUT INSERTED.idasignatura
                VALUES (@idMaestro, @materia, 1, 1);
            `);
        const idAsignatura = resultAsig.recordset[0].idasignatura;

        // PASO 2: Insertar Periodo y obtener su ID generado
        const resultPer = await pool.request()
            .input('horaInicio', sql.VarChar, horaInicioStr)
            .input('horaFin', sql.VarChar, horaFinStr)
            .input('lunes', sql.TinyInt, lunes)
            .input('martes', sql.TinyInt, martes)
            .input('miercoles', sql.TinyInt, miercoles)
            .input('jueves', sql.TinyInt, jueves)
            .input('viernes', sql.TinyInt, viernes)
            .query(`
                INSERT INTO Periodos (hora_inicio, hora_fin, lunes, martes, miercoles, jueves, viernes, activo)
                OUTPUT INSERTED.idperiodo
                VALUES (@horaInicio, @horaFin, @lunes, @martes, @miercoles, @jueves, @viernes, 1);
            `);
        const idPeriodo = resultPer.recordset[0].idperiodo;

        // PASO 3: Unirlos en la tabla Horarios
        await pool.request()
            .input('idasignatura', sql.Int, idAsignatura)
            .input('idperiodo', sql.Int, idPeriodo)
            .input('idarea', sql.Int, parseInt(idarea) || 1)
            .query(`
                INSERT INTO Horarios (idasignatura, idperiodo, idArea, activo)
                VALUES (@idasignatura, @idperiodo, @idarea, 1);
            `);

        res.json({ mensaje: "Materia guardada correctamente" });
    } catch(error: any) {
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
    } catch(error:any){
        res.status(500).send(error.message);
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Backend corriendo en http://localhost:${PORT}`);
});