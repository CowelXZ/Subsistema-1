// server/routes/alumnos.ts
import { Router } from 'express';
import { getConnection, sql } from '../database.js'; // Asegúrate de que la ruta sea correcta

const router = Router();

// Endpoint para obtener todos los grupos activos y sus alumnos
router.get('/grupos', async (req, res) => {
    try {
        const pool = await getConnection();
        if (!pool) throw new Error("Sin conexión a BD");

        // Hacemos un JOIN desde Grupos hacia Alumnos y luego a Usuarios
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
            WHERE G.activo = 1
            ORDER BY G.Semestre ASC, G.Grupo ASC, U.ApellidoPaterno ASC, U.Nombre ASC
        `);

        const flatData = result.recordset;

        // Convertimos el resultado plano de SQL al formato anidado (JSON) que usa React
        const gruposMap = new Map();

        flatData.forEach(row => {
            // Si el grupo no existe en nuestro mapa, lo creamos
            if (!gruposMap.has(row.idgrupo)) {
                gruposMap.set(row.idgrupo, {
                    id: row.idgrupo,
                    nombreGrupo: row.nombreGrupo || '-',
                    semestre: row.semestreGrupo ? row.semestreGrupo.toString() : '1',
                    activo: row.grupoActivo === 1,
                    alumnos: []
                });
            }

            // Si la fila trae información de un alumno, lo agregamos al arreglo de su grupo
            if (row.idalumno && row.matricula) {
                const grupo = gruposMap.get(row.idgrupo);

                // Formateamos el nombre completo sin espacios dobles
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

        // Convertimos el Mapa a un Arreglo final
        const payload = Array.from(gruposMap.values());

        res.json(payload);
    } catch (error: any) {
        console.error("Error al obtener grupos y alumnos:", error);
        res.status(500).send(error.message);
    }
});

export default router;