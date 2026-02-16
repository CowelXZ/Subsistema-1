import express from 'express';
import cors from 'cors';
import { getConnection, sql } from './database';

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// --- RUTAS (ENDPOINTS) ---

// 1. Prueba de conexión
app.get('/api/test', async (req, res) => {
    try {
        const pool = await getConnection();
        if (!pool) throw new Error("No se pudo conectar a SQL Server");

        const result = await pool.request().query('SELECT GETDATE() as fecha');
        res.json(result.recordset[0]);
    } catch (error: any) {
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
    } catch (error: any) {
        res.status(500).send(error.message);
    }
});

// 3. Registrar Nuevo Usuario (INSERT) - ACTUALIZADO CON LÓGICA DE SEXO
app.post('/api/usuarios/crear', async (req, res) => {
    try {
        const {
            matricula, nombres, apellidoPaterno, apellidoMaterno,
            grado, grupo, carrera, sexo, observaciones,
            fotoBase64
        } = req.body;

        const pool = await getConnection();
        if (!pool) throw new Error("Sin conexión a BD");

        // Convertir Base64 a Binario
        let fotoBuffer = null;
        if (fotoBase64) {
            const base64Data = fotoBase64.split(';base64,').pop();
            fotoBuffer = Buffer.from(base64Data, 'base64');
        }

        // Lógica para el Sexo (1=M, 2=F, 3=NB)
        let valorSexo = 3; // Por defecto NB
        if (sexo === 'M') valorSexo = 1;
        if (sexo === 'F') valorSexo = 2;

        // Ejecutar SP 'RegistrarUsuarios'
        await pool.request()
            .input('autoridad', sql.VarChar, 'A')
            .input('usuario', sql.VarChar, matricula)
            .input('puesto', sql.VarChar, carrera || 'ESTUDIANTE')
            .input('ubicacion', sql.VarChar, 'UAT-FCAV')
            .input('nombre', sql.VarChar, nombres)
            .input('apellidopaterno', sql.VarChar, apellidoPaterno)
            .input('apellidomaterno', sql.VarChar, apellidoMaterno || '')
            .input('foto', sql.VarBinary, fotoBuffer)
            .input('sexo', sql.TinyInt, valorSexo) // <--- USAMOS LA VARIABLE CALCULADA
            .input('activo', sql.TinyInt, 1)
            .input('status', sql.VarChar, 'Activo')
            .input('fechacreacion', sql.DateTime, new Date())
            .input('observaciones', sql.VarChar, observaciones || 'Registro Web')
            .execute('RegistrarUsuarios');

        // Ligar con Grupo
        if (grado && grupo) {
            await pool.request()
                .input('usuario', sql.VarChar, matricula)
                .input('grupo', sql.VarChar, grupo)
                .input('semestre', sql.Int, parseInt(grado))
                .execute('RegistrarAlumnosCSV');
        }

        res.json({ mensaje: 'Usuario registrado con éxito' });

    } catch (error: any) {
        console.error(error);
        res.status(500).send(error.message);
    }
});

// 4. Buscar Horario por ID y Fecha Actual
app.get('/api/horario/:idUsuario', async (req, res) => {
    try {
        const { idUsuario } = req.params;
        const pool = await getConnection();

        if (!pool) throw new Error("Sin conexión a BD");

        const fechaActual = new Date();

        const result = await pool.request()
            .input('idusuario', sql.Int, idUsuario)
            .input('horas', sql.DateTime, fechaActual)
            .execute('BuscarHorarioByUserAndDate');

        if (result.recordset.length > 0) {
            res.json(result.recordset[0]);
        } else {
            res.json(null);
        }
    } catch (error: any) {
        console.error("Error buscando horario:", error);
        res.status(500).send(error.message);
    }
});

// 5. Buscar Usuario por Matrícula (GET) - EL BUENO
app.get('/api/usuarios/:matricula', async (req, res) => {
    try {
        const { matricula } = req.params;
        const pool = await getConnection();

        const result = await pool?.request()
            .input('usuario', sql.VarChar, matricula)
            .execute('BuscarUsuario');

        if (result && result.recordset.length > 0) {
            const usuario = result.recordset[0];

            let fotoBase64 = null;
            if (usuario.Foto) {
                fotoBase64 = `data:image/jpeg;base64,${Buffer.from(usuario.Foto).toString('base64')}`;
            }

            // Enviamos los datos mapeados correctamente para React
            res.json({
                matricula: usuario.Usuario,
                nombres: usuario.Nombre,
                apellidoPaterno: usuario.ApellidoPaterno,
                apellidoMaterno: usuario.ApellidoMaterno,
                carrera: usuario.Puesto,
                // Mapeo inverso: BD -> Frontend
                sexo: usuario.Sexo === 1 ? 'M' : (usuario.Sexo === 2 ? 'F' : 'NB'),
                observaciones: usuario.Observaciones,
                foto: fotoBase64
            });
        } else {
            res.status(404).json({ mensaje: 'Usuario no encontrado' });
        }

    } catch (error: any) {
        console.error(error);
        res.status(500).send(error.message);
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Backend corriendo en http://localhost:${PORT}`);
});