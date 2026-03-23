// server/routes/alumnos.ts
import { Router } from 'express';
import { getConnection, sql } from '../database.js';

const router = Router();

// 1. OBTENER GRUPOS (Ahora trae tanto activos como inactivos)
router.get('/grupos', async (req, res) => {
    try {
        const pool = await getConnection();
        if (!pool) throw new Error("Sin conexión a BD");

        // ELIMINAMOS EL "WHERE G.activo = 1" para que traiga TODO el historial
        const result = await pool.request().query(`
            SELECT 
                G.idgrupo,
                G.Grupo AS nombreGrupo,
                G.Semestre AS semestreGrupo,
                G.activo AS grupoActivo,
                G.Carrera AS carreraGrupo,
                G.Salon AS salonGrupo,
                A.idalumno,
                A.activo AS alumnoActivo,
                U.Usuario AS matricula,
                U.Nombre,
                U.ApellidoPaterno,
                U.ApellidoMaterno
            FROM Grupos G
            LEFT JOIN Alumnos A ON G.idgrupo = A.idgrupo
            LEFT JOIN Usuarios U ON A.idusuario = U.idUsuario
            ORDER BY G.Semestre ASC, G.Grupo ASC, U.ApellidoPaterno ASC, U.Nombre ASC
        `);

        const flatData = result.recordset;
        const gruposMap = new Map();

        flatData.forEach(row => {
            if (!gruposMap.has(row.idgrupo)) {
                gruposMap.set(row.idgrupo, {
                    id: row.idgrupo,
                    nombreGrupo: row.nombreGrupo || '-',
                    semestre: row.semestreGrupo ? row.semestreGrupo.toString() : '1',
                    activo: row.grupoActivo === 1,
                    alumnos: []
                });
            }

            if (row.idalumno && row.matricula) {
                const grupo = gruposMap.get(row.idgrupo);
                const nombreCompleto = `${row.Nombre || ''} ${row.ApellidoPaterno || ''} ${row.ApellidoMaterno || ''}`.trim().replace(/\s+/g, ' ');

                grupo.alumnos.push({
                    id: row.idalumno,
                    nombre: nombreCompleto,
                    matricula: row.matricula,
                    carrera: row.carreraGrupo || 'N/A',
                    salon: row.salonGrupo || 'N/A',
                    activo: row.alumnoActivo === 1
                });
            }
        });

        const payload = Array.from(gruposMap.values());
        res.json(payload);
    } catch (error: any) {
        console.error("Error al obtener grupos y alumnos:", error);
        res.status(500).send(error.message);
    }
});

// 2. ELIMINAR (Desvincular) a un alumno del grupo
router.delete('/alumnos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await getConnection();
        if (!pool) throw new Error("Sin conexión a BD");

        await pool.request()
            .input('idalumno', sql.Int, parseInt(id))
            .query('DELETE FROM Alumnos WHERE idalumno = @idalumno');

        res.json({ mensaje: "Alumno desvinculado exitosamente." });
    } catch (error: any) {
        res.status(500).send(error.message);
    }
});

// 3. NUEVO: CAMBIAR ESTADO DE UN ALUMNO (Individual)
router.put('/alumnos/:id/estado', async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body; // Recibe 1 o 0
        const pool = await getConnection();

        await pool.request()
            .input('idalumno', sql.Int, parseInt(id))
            .input('estado', sql.TinyInt, estado)
            .query('UPDATE Alumnos SET activo = @estado WHERE idalumno = @idalumno');

        res.json({ mensaje: "Estado del alumno actualizado." });
    } catch (error: any) {
        res.status(500).send(error.message);
    }
});

// 4. NUEVO: CAMBIAR ESTADO DEL GRUPO (MASIVO)
router.put('/grupos/:id/estado', async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;
        const pool = await getConnection();

        // ¡LA MAGIA! Si apagas el grupo, se apagan sus alumnos. Si lo prendes, se prenden sus alumnos.
        await pool.request()
            .input('idgrupo', sql.Int, parseInt(id))
            .input('estado', sql.TinyInt, estado)
            .query(`
                UPDATE Grupos SET activo = @estado WHERE idgrupo = @idgrupo;
                UPDATE Alumnos SET activo = @estado WHERE idgrupo = @idgrupo;
            `);

        res.json({ mensaje: "Estado del grupo y sus alumnos actualizado masivamente." });
    } catch (error: any) {
        res.status(500).send(error.message);
    }
});

export default router;