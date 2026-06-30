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
// Obtener el historial completo de la bitácora (Solo para consultas administrativas)
router.get('/bitacora', async (req: Request, res: Response): Promise<void> => {
    try {
        const pool = await getConnection();
        if (!pool) throw new Error('No hay conexión a la base de datos');

        // Consultamos la bitácora uniendo los datos del usuario correspondiente
        const result = await pool.request().query(`
            SELECT 
                b.idAcceso,
                b.fechaHora,
                b.ipDireccion,
                b.exitoso,
                u.nombre,
                u.apellidoPaterno,
                u.apellidoMaterno,
                u.correo,
                u.rol
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

// Registrar un nuevo usuario del sistema (Solo ADMIN)
router.post('/registrar', async (req: Request, res: Response): Promise<void> => {
    const { correo, nombre, apellidoPaterno, apellidoMaterno, contrasena, rol } = req.body;

    try {
        const pool = await getConnection();
        if (!pool) throw new Error('No hay conexión a la base de datos');

        await pool.request()
            .input('correo', sql.VarChar, correo)
            .input('nombre', sql.VarChar, nombre)
            .input('apellidoPaterno', sql.VarChar, apellidoPaterno)
            .input('apellidoMaterno', sql.VarChar, apellidoMaterno || null)
            .input('contrasena', sql.VarChar, contrasena) // Guardado en texto plano (por ahora)
            .input('rol', sql.VarChar, rol)
            .query(`
                INSERT INTO UsuariosSistema (correo, nombre, apellidoPaterno, apellidoMaterno, contrasena, rol)
                VALUES (@correo, @nombre, @apellidoPaterno, @apellidoMaterno, @contrasena, @rol)
            `);

        res.json({ mensaje: 'Usuario creado exitosamente.' });
    } catch (error: any) {
        console.error('Error al registrar usuario:', error);
        // Error 2627 es el código de SQL Server cuando violamos una restricción UNIQUE (correo repetido)
        if (error.number === 2627) {
            res.status(400).json({ mensaje: 'El correo electrónico ingresado ya está registrado en el sistema.' });
        } else {
            res.status(500).json({ mensaje: 'Error interno del servidor al crear el usuario.' });
        }
    }
});

export default router;