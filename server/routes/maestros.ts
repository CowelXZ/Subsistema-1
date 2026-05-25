import { Router, NextFunction } from 'express';
import { getConnection, sql } from '../database.js';
import { validateId } from '../middleware/validateId.js';

const router = Router();

// 1. Registrar Nuevo Maestro y sus Horarios
router.post('/crear', async (req, res) => {
try {
        const {
            numeroEmpleado, nombres, apellidoPaterno, apellidoMaterno,
            gradoAcademico, correo, sexo, observaciones, fotoBase64, horario
        } = req.body;

        const pool = await getConnection();
        if (!pool) throw new Error("Sin conexión a BD");

        let fotoBuffer = null;
        if (fotoBase64) {
            const base64Data = fotoBase64.split(';base64,').pop();
            fotoBuffer = Buffer.from(base64Data, 'base64');
        }

        let valorSexo = 'No Binario';
        if (sexo === 'M') valorSexo = 'Masculino';
        if (sexo === 'F') valorSexo = 'Femenino';

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

        if (horario && horario.length > 0) {
            for (const clase of horario) {
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
        next(error);
    }
});

// 2. Buscar maestro y todo su horario por Matrícula
router.get('/buscar/:matricula', async (req, res) => {
    try {
        const pool = await getConnection();
        if (!pool) throw new Error("Sin conexión");

        const { matricula } = req.params;

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
        let fotoBase64 = null;
        if (maestro.Foto) {
            fotoBase64 = `data:image/jpeg;base64,${maestro.Foto.toString('base64')}`;
        }

        const materiasResult = await pool.request()
            .input('matricula', sql.VarChar, matricula)
            .execute('BuscarHorarioMaestroWeb'); 

        res.json({
            maestro: { ...maestro, Foto: fotoBase64 },
            materias: materiasResult.recordset
        });

    } catch (error: any) {
        next(error);
    }
});

// 3. Obtener Carga Académica (El JOIN de las 3 tablas + Grupos)
router.get('/carga', async (req, res) => {
    try {
        const pool = await getConnection();
        if (!pool) throw new Error("Sin conexión a BD");

        const maestrosResult = await pool.request().query('SELECT idMaestro, Nombre, ApellidoPaterno, ApellidoMaterno, Foto, Activo FROM Maestros');
        const maestros = maestrosResult.recordset;

        const clasesResult = await pool.request().query(`
            SELECT A.idasignatura as id, A.idMaestro, A.Materia as materia, 
                   CONVERT(varchar(5), P.hora_inicio, 108) as horaInicio, 
                   CONVERT(varchar(5), P.hora_fin, 108) as horaFin,
                   P.lunes, P.martes, P.miercoles, P.jueves, P.viernes,
                   G.Carrera as carrera, G.Salon as salon, G.Semestre as semestre, G.Grupo as grupo
            FROM Asignaturas A
            INNER JOIN Horarios H ON A.idasignatura = H.idasignatura
            INNER JOIN Periodos P ON H.idperiodo = P.idperiodo
            LEFT JOIN Grupos G ON A.idgrupo = G.idgrupo
            WHERE A.idMaestro IS NOT NULL
        `);
        const clasesRaw = clasesResult.recordset;

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
                    id: c.id, materia: c.materia, horaInicio: c.horaInicio, horaFin: c.horaFin,
                    dias: dias, carrera: c.carrera || 'N/A', salon: c.salon || 'N/A',
                    semestre: c.semestre || '-', grupo: c.grupo || '-'
                };
            });

            return { id: m.idMaestro, nombre: nombreCompleto, foto: fotoBase64, activo: m.Activo === 1, clases: clasesDelMaestro };
        });

        res.json(payload);
    } catch (error: any) {
        next(error);
    }
});

// 4. Agregar materia
router.post('/agregar-materia', async (req, res) => {
    try {
        const { idMaestro, materia, horaInicio, horaFin, dias, idarea, semestre, grupo, carrera, salon } = req.body;
        const pool = await getConnection();

        const lunes = dias.includes('L') ? 1 : 0;
        const martes = dias.includes('M') ? 1 : 0;
        const miercoles = dias.includes('MM') ? 1 : 0;
        const jueves = dias.includes('J') ? 1 : 0;
        const viernes = dias.includes('V') ? 1 : 0;

        let inicioLimpio = horaInicio.trim();
        let finLimpio = horaFin.trim();
        if (inicioLimpio.length === 4) inicioLimpio = '0' + inicioLimpio;
        if (finLimpio.length === 4) finLimpio = '0' + finLimpio;

        const horaInicioStr = `19000101 ${inicioLimpio}:00`;
        const horaFinStr = `19000101 ${finLimpio}:00`;

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
            .execute('RegistrarHorarioWeb');

        res.json({ mensaje: "Materia guardada correctamente" });
    } catch (error: any) {
        next(error);
    }
});

// 5. Eliminar materia
router.delete('/eliminar-materia/:id', validateId('id'), async (req, res, next: NextFunction) => {
    try {
        const { id } = req.params;
        const pool = await getConnection();
        await pool.request()
            .input('id', sql.Int, id)
            .query(`
                DELETE FROM Horarios WHERE idasignatura = @id;
                DELETE FROM Asignaturas WHERE idasignatura = @id;
            `);
        res.json({ mensaje: "Materia eliminada" });
    } catch (error: any) {
        next(error);
    }
});

// 6. Editar materia
router.put('/editar-materia/:id', validateId('id'), async (req, res, next: NextFunction) => {
    try {
        const idAsignatura = req.params.id;
        const { materia, horaInicio, horaFin, dias, semestre, grupo, carrera, salon } = req.body;
        const pool = await getConnection();

        const lunes = dias.includes('L') ? 1 : 0;
        const martes = dias.includes('M') ? 1 : 0;
        const miercoles = dias.includes('MM') ? 1 : 0;
        const jueves = dias.includes('J') ? 1 : 0;
        const viernes = dias.includes('V') ? 1 : 0;

        let inicioLimpio = horaInicio.trim();
        let finLimpio = horaFin.trim();
        if (inicioLimpio.length === 4) inicioLimpio = '0' + inicioLimpio;
        if (finLimpio.length === 4) finLimpio = '0' + finLimpio;

        const horaInicioStr = `19000101 ${inicioLimpio}:00`;
        const horaFinStr = `19000101 ${finLimpio}:00`;

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
                DECLARE @idgrupo INT;
                SELECT @idgrupo = idgrupo FROM Grupos WHERE Grupo = @grupo AND Semestre = @semestre AND Carrera = @carrera;
                IF @idgrupo IS NULL
                BEGIN
                    INSERT INTO Grupos (Grupo, Salon, Carrera, Semestre, Activo) VALUES (@grupo, @salon, @carrera, @semestre, 1);
                    SET @idgrupo = SCOPE_IDENTITY();
                END
                ELSE
                BEGIN
                    UPDATE Grupos SET Salon = @salon WHERE idgrupo = @idgrupo;
                END

                UPDATE Asignaturas SET Materia = @materia, idgrupo = @idgrupo WHERE idasignatura = @idAsignatura;

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
        next(error);
    }
});

// 7. Cambiar estado
router.put('/estado/:idMaestro', validateId('idMaestro'), async (req, res, next: NextFunction) => {
    try {
        const { idMaestro } = req.params;
        const { estado } = req.body; 
        const pool = await getConnection();
        await pool.request()
            .input('id', sql.Int, idMaestro)
            .input('estado', sql.TinyInt, estado)
            .query(`
                UPDATE Maestros SET Activo = @estado WHERE idMaestro = @id;
                UPDATE Asignaturas SET activo = @estado WHERE idMaestro = @id;
            `);
        res.json({ mensaje: "Estado actualizado" });
    } catch (error: any) {
        next(error);
    }
});

export default router;