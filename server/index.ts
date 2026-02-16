import express from 'express';
import cors from 'cors';
// CORRECCIÓN 1: Agregamos .js al final (necesario para ESM/Vite)
import { getConnection, sql } from './database';

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

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Backend corriendo en http://localhost:${PORT}`);
});