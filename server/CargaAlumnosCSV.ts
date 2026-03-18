import { Router } from 'express';
import { getConnection, sql } from './database.js';

const router = Router();

// Endpoint: POST /api/csv/alumnos
router.post('/', async (req, res) => {
    try {
        const { alumnos } = req.body;

        if (!alumnos || alumnos.length === 0) {
            return res.status(400).json({ mensaje: "El archivo CSV está vacío o no tiene el formato correcto." });
        }

        const pool = await getConnection();
        if (!pool) throw new Error("Sin conexión a BD");

        let insertados = 0;
        let errores = 0;

        // Iteramos sobre cada fila del Excel
        for (const alumno of alumnos) {
            if (!alumno.Usuario || alumno.Usuario.trim() === '') {
                continue; 
            }
            try {
                // Mapeo del sexo
                let sexoId = 1; 
                if (alumno.Sexo === 'F') sexoId = 2;
                if (alumno.Sexo === 'NB') sexoId = 3;

                // Llamada al Stored Procedure para insertar al usuario
                await pool.request()
                    .input('autoridad', sql.VarChar, 'A')
                    .input('usuario', sql.VarChar, alumno.Usuario)
                    .input('puesto', sql.VarChar, 'ALUMNO')
                    .input('ubicacion', sql.VarChar, alumno.Ubicacion || 'SIN ASIGNAR')
                    .input('nombre', sql.VarChar, alumno.Nombre)
                    .input('apellidopaterno', sql.VarChar, alumno.ApellidoPaterno)
                    .input('apellidomaterno', sql.VarChar, alumno.ApellidoMaterno || '')
                    .input('foto', sql.VarBinary, null) 
                    .input('sexo', sql.TinyInt, sexoId)
                    .input('activo', sql.TinyInt, 1)
                    .input('status', sql.VarChar, 'ACCESO PERMITIDO')
                    .input('fechacreacion', sql.DateTime, new Date())
                    .input('observaciones', sql.VarChar, 'Carga Masiva CSV')
                    .execute('RegistrarUsuarios');

                insertados++;
            } catch (err) {
                console.error(`Error al insertar a ${alumno.Usuario}:`, err);
                errores++;
            }
        }

        res.status(200).json({ 
            mensaje: `Carga finalizada exitosamente. Registros procesados: ${insertados}.` 
        });

    } catch (error: any) {
        console.error("Error general en carga masiva:", error);
        res.status(500).json({ mensaje: error.message });
    }
});

export default router;