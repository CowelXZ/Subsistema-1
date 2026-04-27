import { Router } from 'express';
import { getConnection, sql } from '../database.js';

const router = Router();

// 1. Buscar Usuario por Matrícula (Para el Escáner o Edición)
router.get('/:matricula', async (req, res) => {
    try {
        const { matricula } = req.params;
        const pool = await getConnection();

        const result = await pool?.request()
            .input('usuario', sql.VarChar, matricula)
            .execute('BuscarUsuario');

        if (result && result.recordset && result.recordset.length > 0) {
            const usuarioRaw = result.recordset[0];
            let fotoBase64 = null;
            if (usuarioRaw.Foto) {
                fotoBase64 = `data:image/jpeg;base64,${Buffer.from(usuarioRaw.Foto).toString('base64')}`;
            }

            let estadoAcceso = (usuarioRaw.Status === 'DENEGADO') ? 'denegado' : 'permitido';

            let gradoReal = '', grupoReal = '', carreraReal = '';

            if (usuarioRaw.idUsuario) {
                const queryAlumno = await pool?.request()
                    .input('idUsuario', sql.Int, usuarioRaw.idUsuario)
                    .query(`
                        SELECT G.Semestre, G.Grupo, G.Carrera
                        FROM Alumnos A
                        INNER JOIN Grupos G ON A.idgrupo = G.idgrupo
                        WHERE A.idusuario = @idUsuario AND A.activo = 1
                    `);

                if (queryAlumno && queryAlumno.recordset.length > 0) {
                    const info = queryAlumno.recordset[0];
                    gradoReal = info.Semestre?.toString() || '';
                    grupoReal = info.Grupo?.trim() || '';
                    carreraReal = info.Carrera?.trim() || '';
                }
            }
// Traducimos el número de la BD a la letra que entiende React
            let valorSexo = 'M';
            if (usuarioRaw.Sexo === 2) valorSexo = 'F';
            if (usuarioRaw.Sexo === 3) valorSexo = 'NB';

            // Armamos el paquete exactamente con los nombres que espera useRegistroUsuario.ts
            res.json({
                ...usuarioRaw,
                matricula: usuarioRaw.Usuario,
                nombres: usuarioRaw.Nombre,
                apellidoPaterno: usuarioRaw.ApellidoPaterno || '',
                apellidoMaterno: usuarioRaw.ApellidoMaterno || '',
                sexo: valorSexo,
                observaciones: usuarioRaw.Observaciones || '',
                foto: fotoBase64,
                statusAcceso: estadoAcceso,
                grado: gradoReal,
                grupo: grupoReal,
                carrera: carreraReal || usuarioRaw.Puesto
            });
        } else {
            res.status(404).json({ mensaje: 'Usuario no encontrado' });
        }
    } catch (error: any) { res.status(500).send(error.message); }
});

// 2. Buscar Horario Actual por ID de Usuario (Para Registro de Entrada)
router.get('/horario/:idUsuario', async (req, res) => {
    try {
        const { idUsuario } = req.params;
        const pool = await getConnection();
        if (!pool) throw new Error("Sin conexión a BD");

        const result = await pool.request()
            .input('idusuario', sql.Int, idUsuario)
            .input('horas', sql.DateTime, new Date()) 
            .execute('BuscarHorarioByUserAndDate');

        res.json(result.recordset.length > 0 ? result.recordset[0] : null);
    } catch (error: any) {
        console.error("Error buscando horario:", error);
        res.status(500).send(error.message);
    }
});

// 3. Registrar Nuevo Usuario (Alumno)
router.post('/crear', async (req, res) => {
    try {
        const { matricula, nombres, apellidoPaterno, apellidoMaterno, grado, grupo, carrera, sexo, observaciones, fotoBase64, statusAcceso } = req.body;
        const pool = await getConnection();
        if (!pool) throw new Error("Sin conexión a BD");

        let fotoBuffer = null;
        if (fotoBase64) fotoBuffer = Buffer.from(fotoBase64.split(';base64,').pop() || '', 'base64');

        let sexoId = (sexo === 'F') ? 2 : (sexo === 'NB' ? 3 : 1);
        const statusBD = (statusAcceso === 'denegado') ? 'DENEGADO' : 'ACCESO PERMITIDO';

        // 3.1 Registrar en tabla Usuarios (vía SP)
        await pool.request()
            .input('autoridad', sql.VarChar, 'A').input('usuario', sql.VarChar, matricula)
            .input('puesto', sql.VarChar, 'ALUMNO').input('ubicacion', sql.VarChar, 'SIN ASIGNAR')
            .input('nombre', sql.VarChar, nombres).input('apellidopaterno', sql.VarChar, apellidoPaterno)
            .input('apellidomaterno', sql.VarChar, apellidoMaterno || '').input('foto', sql.VarBinary, fotoBuffer)
            .input('sexo', sql.TinyInt, sexoId).input('activo', sql.TinyInt, 1)
            .input('status', sql.VarChar, statusBD).input('fechacreacion', sql.DateTime, new Date())
            .input('observaciones', sql.VarChar, observaciones || '')
            .execute('RegistrarUsuarios');

        // 3.2 Obtener ID generado y vincular Grupo/Alumno
        const userRes = await pool.request().input('m', sql.VarChar, matricula).query('SELECT idUsuario FROM Usuarios WHERE Usuario = @m');
        const idU = userRes.recordset[0].idUsuario;

        const resG = await pool.request().input('g', sql.Char, grupo).input('s', sql.Int, parseInt(grado)).input('c', sql.VarChar, carrera)
            .query(`
                DECLARE @idg INT;
                SELECT @idg = idgrupo FROM Grupos WHERE Grupo = @g AND Semestre = @s AND Carrera = @c;
                IF @idg IS NULL BEGIN
                    INSERT INTO Grupos (Grupo, Salon, Carrera, Semestre, Activo) VALUES (@g, 'POR ASIGNAR', @c, @s, 1);
                    SET @idg = SCOPE_IDENTITY();
                END
                SELECT @idg AS idgrupo;
            `);
        
        await pool.request().input('iu', sql.Int, idU).input('ig', sql.Int, resG.recordset[0].idgrupo).input('s', sql.Int, parseInt(grado)).input('m', sql.VarChar, matricula)
            .query(`
                IF EXISTS (SELECT 1 FROM Alumnos WHERE idusuario = @iu)
                    UPDATE Alumnos SET idgrupo = @ig, Semestre = @s, activo = 1 WHERE idusuario = @iu;
                ELSE
                    INSERT INTO Alumnos (Alumno, Semestre, idusuario, idgrupo, activo) VALUES (@m, @s, @iu, @ig, 1);
            `);

        res.status(200).json({ mensaje: 'Usuario procesado correctamente' });
    } catch (error: any) { res.status(500).send(error.message); }
});

export default router;