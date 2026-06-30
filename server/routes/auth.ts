import { Router, Request, Response } from 'express';
import { sql, getConnection } from '../database';

const router = Router();

router.post('/login', async (req: Request, res: Response): Promise<void> => {
    const { correo, contrasena } = req.body;

    try {
        const pool = await getConnection();
        if (!pool) throw new Error('No hay conexión a la base de datos');

        // 1. Buscamos al usuario por su correo
        const result = await pool.request()
            .input('correo', sql.VarChar, correo)
            .query('SELECT * FROM UsuariosSistema WHERE correo = @correo AND activo = 1');

        const usuario = result.recordset[0];

        // Si no existe el usuario, respondemos con error genérico por seguridad
        if (!usuario) {
            res.status(401).json({ mensaje: 'Correo o contraseña incorrectos.' });
            return;
        }

        // 2. Validamos la contraseña (Temporalmente en texto plano)
        if (usuario.contrasena !== contrasena) {
            // Guardamos el intento fallido en la bitácora
            await pool.request()
                .input('idUsuario', sql.Int, usuario.idUsuario)
                .input('exitoso', sql.TinyInt, 0)
                .query('INSERT INTO BitacoraAccesos (idUsuario, exitoso) VALUES (@idUsuario, @exitoso)');
            
            res.status(401).json({ mensaje: 'Correo o contraseña incorrectos.' });
            return;
        }

        // 3. Si todo es correcto, actualizamos la fecha de último acceso
        await pool.request()
            .input('idUsuario', sql.Int, usuario.idUsuario)
            .query('UPDATE UsuariosSistema SET ultimoAcceso = GETDATE() WHERE idUsuario = @idUsuario');

        // 4. Registramos el acceso exitoso en la bitácora
        await pool.request()
            .input('idUsuario', sql.Int, usuario.idUsuario)
            .input('exitoso', sql.TinyInt, 1)
            .query('INSERT INTO BitacoraAccesos (idUsuario, exitoso) VALUES (@idUsuario, @exitoso)');

        // 5. Enviamos la respuesta al Frontend (nunca enviamos la contraseña de vuelta)
        res.json({
            mensaje: 'Inicio de sesión exitoso',
            usuario: {
                idUsuario: usuario.idUsuario,
                nombre: usuario.nombre,
                rol: usuario.rol
            }
        });

    } catch (error) {
        console.error('Error en el login:', error);
        res.status(500).json({ mensaje: 'Error interno del servidor.' });
    }
});

export default router;