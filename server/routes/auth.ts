import { Router, Request, Response } from 'express';
import { sql, getConnection } from '../database';
import { verificarToken } from '../middleware/validarToken';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';


const router = Router();

// Llave maestra para firmar los tokens (En producción esto va en un archivo .env)
const JWT_SECRET = process.env.JWT_SECRET || 'Firma_Super_Segura_UAT_2026';

// 1. REGISTRAR UN NUEVO USUARIO (ENCRIPTADO) — Solo usuarios autenticados
router.post('/registrar', verificarToken, async (req: Request, res: Response): Promise<void> => {
    const { correo, nombre, apellidoPaterno, apellidoMaterno, contrasena, rol } = req.body;

    try {
        const pool = await getConnection();
        if (!pool) throw new Error('No hay conexión a la base de datos');

        // MAGIA DE SEGURIDAD: Encriptamos la contraseña antes de guardarla
        const saltRondas = 10;
        const contrasenaHasheada = await bcrypt.hash(contrasena, saltRondas);

        await pool.request()
            .input('correo', sql.VarChar, correo)
            .input('nombre', sql.VarChar, nombre)
            .input('apellidoPaterno', sql.VarChar, apellidoPaterno)
            .input('apellidoMaterno', sql.VarChar, apellidoMaterno || null)
            .input('contrasena', sql.VarChar, contrasenaHasheada) // Guardamos el HASH, no el texto plano
            .input('rol', sql.VarChar, rol)
            .query(`
                INSERT INTO UsuariosSistema (correo, nombre, apellidoPaterno, apellidoMaterno, contrasena, rol)
                VALUES (@correo, @nombre, @apellidoPaterno, @apellidoMaterno, @contrasena, @rol)
            `);

        res.json({ mensaje: 'Usuario creado exitosamente.' });
    } catch (error: any) {
        console.error('Error al registrar usuario:', error);
        if (error.number === 2627) { // Error de correo duplicado
            res.status(400).json({ mensaje: 'El correo electrónico ya está registrado en el sistema.' });
        } else {
            res.status(500).json({ mensaje: 'Error interno del servidor al crear el usuario.' });
        }
    }
});

// 2. INICIAR SESIÓN (VERIFICACIÓN Y JWT)
router.post('/login', async (req: Request, res: Response): Promise<void> => {
    const { correo, contrasena } = req.body;

    try {
        const pool = await getConnection();
        if (!pool) throw new Error('No hay conexión a la base de datos');

        // Buscamos al usuario por su correo
        const result = await pool.request()
            .input('correo', sql.VarChar, correo)
            .query(`
                SELECT idUsuario, correo, nombre, apellidoPaterno, apellidoMaterno, contrasena, rol 
                FROM UsuariosSistema 
                WHERE correo = @correo
            `);

        const usuario = result.recordset[0];

        // 2A. ¿El usuario existe?
        if (!usuario) {
            res.status(401).json({ mensaje: 'Correo o contraseña incorrectos.' }); // Mensaje genérico para no dar pistas
            return;
        }

        // 2B. ¿La contraseña es correcta? (Comparamos el texto plano con el Hash)
        const passwordValida = await bcrypt.compare(contrasena, usuario.contrasena);
        await pool.request()
            .input('idUsuario', sql.Int, usuario.idUsuario)
            .input('exitoso', sql.Bit, passwordValida ? 1 : 0)
            .input('ipDireccion', sql.VarChar, req.ip || '0.0.0.0')
            .query(`
                INSERT INTO BitacoraAccesos (idUsuario, exitoso, ipDireccion) 
                VALUES (@idUsuario, @exitoso, @ipDireccion)
            `);

        if (!passwordValida) {
            res.status(401).json({ mensaje: 'Correo o contraseña incorrectos.' });
            return;
        }
        const token = jwt.sign(
            { idUsuario: usuario.idUsuario, correo: usuario.correo, rol: usuario.rol }, 
            JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.json({
            mensaje: 'Inicio de sesión exitoso',
            token: token,
            usuario: {
                nombre: usuario.nombre,
                correo: usuario.correo,
                rol: usuario.rol
            }
        });

    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ mensaje: 'Error interno del servidor.' });
    }
});
// 3. CONSULTAR LA BITÁCORA (El que ya teníamos)
router.get('/bitacora', verificarToken, async (req: Request, res: Response): Promise<void> => {
    try {
        const pool = await getConnection();
        if (!pool) throw new Error('No hay conexión a la base de datos');

        const result = await pool.request().query(`
            SELECT 
                b.idAcceso, b.fechaHora, b.ipDireccion, b.exitoso,
                u.nombre, u.apellidoPaterno, u.apellidoMaterno, u.correo, u.rol
            FROM BitacoraAccesos b
            INNER JOIN UsuariosSistema u ON b.idUsuario = u.idUsuario
            ORDER BY b.fechaHora DESC
        `);

        res.json(result.recordset);
    } catch (error) {
        console.error('Error al obtener la bitácora:', error);
        res.status(500).json({ mensaje: 'Error interno del servidor al consultar el historial.' });
    }
});

export default router;