import { Router, Request, Response } from 'express';
import { sql, getConnection } from '../database';

const router = Router();

// 1. ENDPOINT PARA REGISTRAR CADA ESCANEO (SE LLAMA AUTOMÁTICAMENTE DESDE EL KIOSCO)
router.post('/registrar', async (req: Request, res: Response): Promise<void> => {
    const { 
        matricula, nombreCompleto, tipoUsuario, 
        materiaDestino, grupoDestino, maestroAsignado, 
        aulaDestino, estatusAcceso 
    } = req.body;

    try {
        const pool = await getConnection();
        if (!pool) throw new Error('No hay conexión a la base de datos');

        // Insertamos el "Snapshot" en la nueva tabla HistorialAccesos
        await pool.request()
            .input('matricula', sql.VarChar, matricula)
            .input('nombreCompleto', sql.VarChar, nombreCompleto)
            .input('tipoUsuario', sql.VarChar, tipoUsuario)
            .input('materiaDestino', sql.VarChar, materiaDestino || null)
            .input('grupoDestino', sql.VarChar, grupoDestino || null)
            .input('maestroAsignado', sql.VarChar, maestroAsignado || null)
            .input('aulaDestino', sql.VarChar, aulaDestino || null)
            .input('estatusAcceso', sql.VarChar, estatusAcceso)
            .query(`
                INSERT INTO HistorialAccesos 
                (matricula, nombreCompleto, tipoUsuario, materiaDestino, grupoDestino, maestroAsignado, aulaDestino, estatusAcceso)
                VALUES 
                (@matricula, @nombreCompleto, @tipoUsuario, @materiaDestino, @grupoDestino, @maestroAsignado, @aulaDestino, @estatusAcceso)
            `);

        res.json({ mensaje: 'Acceso registrado en el historial exitosamente.' });
    } catch (error) {
        console.error('Error al guardar historial de acceso:', error);
        res.status(500).json({ mensaje: 'Error interno del servidor al registrar acceso.' });
    }
});

// 2. ENDPOINT PARA CONSULTAR EL HISTORIAL (REPORTES)
router.get('/', async (req: Request, res: Response): Promise<void> => {
    try {
        const pool = await getConnection();
        if (!pool) throw new Error('No hay conexión a la base de datos');

        // Traemos los últimos 1000 registros para no saturar la memoria inicialmente
        const result = await pool.request().query(`
            SELECT TOP 1000
                idAcceso,
                matricula,
                nombreCompleto,
                tipoUsuario,
                materiaDestino,
                grupoDestino,
                maestroAsignado,
                aulaDestino,
                estatusAcceso,
                fechaHora
            FROM HistorialAccesos
            ORDER BY fechaHora DESC
        `);

        res.json(result.recordset);
    } catch (error) {
        console.error('Error al obtener reportes:', error);
        res.status(500).json({ mensaje: 'Error interno del servidor al consultar reportes.' });
    }
});

export default router;