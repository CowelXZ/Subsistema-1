import express from 'express';
import cors from 'cors';
import { getConnection } from './database.js';

// Routers
import usuariosRouter from './routes/usuarios.js';
import maestrosRouter from './routes/maestros.js';
import alumnosRouter from './routes/alumnos.js';
import catalogosRouter from './routes/catalogos.js';

// Cargas Masivas
import rutasCargaAlumnos from './CargaAlumnosCSV.js';
import rutasCargaMaestros from './CargaMaestrosCSV.js';
import rutasCargaMaterias from './CargaMateriasCSV.js';
import rutasCargaHorarios from './CargaHorariosCSV.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// --- CONEXIÓN DE RUTAS MODULARES ---
app.use('/api/usuarios', usuariosRouter);
app.use('/api/maestros', maestrosRouter);
app.use('/api/alumnos-admi', alumnosRouter);
app.use('/api', catalogosRouter); // Carreras, Semestres, Áreas, etc.

// Rutas de Carga Masiva (CSV)
app.use('/api/csv/alumnos', rutasCargaAlumnos);
app.use('/api/csv/maestros', rutasCargaMaestros);
app.use('/api/csv/materias', rutasCargaMaterias);
app.use('/api/csv/horarios', rutasCargaHorarios);

// Test de Salud del Servidor
app.get('/api/test', async (req, res) => {
    try {
        const pool = await getConnection();
        if (!pool) throw new Error("Fallo de conexión");
        res.json({ status: "Online", db: "Connected" });
    } catch (err: any) { res.status(500).send(err.message); }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor purificado y corriendo en http://localhost:${PORT}`);
});