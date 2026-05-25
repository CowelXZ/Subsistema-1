import dotenv from 'dotenv';
dotenv.config({ override: false }); // En Docker, las env vars vienen del docker-compose (no sobreescribir)
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { getConnection } from './database.js';
import { errorHandler } from './middleware/errorHandler.js';

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

// --- SEGURIDAD: Headers HTTP básicos ---
app.use(helmet());

// --- SEGURIDAD: CORS restringido a localhost (uso en red local de oficina) ---
const origenesPermitidos = [
    'http://localhost:5173',   // Vite dev
    'http://localhost:4173',   // Vite preview
    'http://localhost:80',     // Docker / Nginx
    'http://localhost',
];
app.use(cors({
    origin: (origin, callback) => {
        // Permitir peticiones sin origin (Postman, Docker mismo host)
        if (!origin || origenesPermitidos.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Origen no permitido por CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type'],
}));

// --- SEGURIDAD: Límite de tamaño de payload (fotos en base64 ~= 3-4 MB) ---
app.use(express.json({ limit: '8mb' }));

// --- SEGURIDAD: Rate limiting global (protección básica contra abuso) ---
const limiterGeneral = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 300,                   // 300 peticiones por IP en esa ventana
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Demasiadas peticiones. Por favor espera unos minutos.' },
});

// Rate limit más estricto para cargas masivas CSV
const limiterCargaMasiva = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 20,
    message: { error: 'Límite de cargas masivas alcanzado. Intenta en una hora.' },
});

app.use(limiterGeneral);

// --- CONEXIÓN DE RUTAS MODULARES ---
app.use('/api/usuarios', usuariosRouter);
app.use('/api/maestros', maestrosRouter);
app.use('/api/alumnos-admi', alumnosRouter);
app.use('/api', catalogosRouter);

// Rutas de Carga Masiva (CSV) — con rate limit propio
app.use('/api/csv/alumnos', limiterCargaMasiva, rutasCargaAlumnos);
app.use('/api/csv/maestros', limiterCargaMasiva, rutasCargaMaestros);
app.use('/api/csv/materias', limiterCargaMasiva, rutasCargaMaterias);
app.use('/api/csv/horarios', limiterCargaMasiva, rutasCargaHorarios);

// --- Healthcheck interno (solo para Docker / uso local) ---
app.get('/api/health', async (req, res, next) => {
    try {
        const pool = await getConnection();
        if (!pool) throw new Error('Sin conexión a BD');
        res.json({ status: 'OK', db: 'Connected' });
    } catch (err) { next(err); }
});

// --- SEGURIDAD: Middleware de manejo de errores centralizado (SIEMPRE AL FINAL) ---
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});