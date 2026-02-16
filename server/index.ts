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

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Backend corriendo en http://localhost:${PORT}`);
});