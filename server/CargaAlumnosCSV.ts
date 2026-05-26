import { Router } from 'express';
import { getConnection, sql } from './database.js';

const router = Router();

// Endpoint: POST /api/csv/alumnos
router.post('/', async (req, res) => {
    try {
        // BUG #1 FIX: el frontend siempre envía { datos: [...] }, no { alumnos: [...] }
        const { datos: alumnos } = req.body;

        if (!alumnos || alumnos.length === 0) {
            return res.status(400).json({ mensaje: "El archivo CSV está vacío o no tiene el formato correcto." });
        }

        const MAX_REGISTROS = 2000;
        if (alumnos.length > MAX_REGISTROS) {
            return res.status(400).json({ mensaje: `El archivo excede el límite de ${MAX_REGISTROS} registros por carga. Divide el archivo en partes más pequeñas.` });
        }

        const pool = await getConnection();
        if (!pool) throw new Error("Sin conexión a BD");

        let insertados = 0;
        let errores = 0;

        for (const alumno of alumnos) {
            if (!alumno.Usuario || alumno.Usuario.trim() === '') {
                continue;
            }
            try {
                // Mapeo del sexo
                let sexoId = 1;
                if (alumno.Sexo === 'F') sexoId = 2;
                if (alumno.Sexo === 'NB') sexoId = 3;

                // PASO 1: Llamada al SP para insertar en tabla Usuarios
                await pool.request()
                    .input('autoridad', sql.VarChar, 'A')
                    .input('usuario', sql.VarChar, alumno.Usuario.trim())
                    .input('puesto', sql.VarChar, 'ALUMNO')
                    .input('ubicacion', sql.VarChar, 'SIN ASIGNAR')
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

                // BUG #2 FIX: Obtener el idUsuario generado y vincular Grupo/Alumno
                // (igual que hace routes/usuarios.ts POST /crear)
                const userRes = await pool.request()
                    .input('m', sql.VarChar, alumno.Usuario.trim())
                    .query('SELECT idUsuario FROM Usuarios WHERE Usuario = @m');

                if (userRes.recordset.length > 0) {
                    const idU = userRes.recordset[0].idUsuario;
                    const semestreNum = parseInt(alumno.Semestre) || 1;
                    const grupoLetra = alumno.Grupo || 'A';
                    const carreraStr = alumno.Carrera || 'SIN ASIGNAR';

                    // Buscar o crear el grupo
                    const resG = await pool.request()
                        .input('g', sql.Char, grupoLetra)
                        .input('s', sql.Int, semestreNum)
                        .input('c', sql.VarChar, carreraStr)
                        .query(`
                            DECLARE @idg INT;
                            SELECT @idg = idgrupo FROM Grupos WHERE Grupo = @g AND Semestre = @s AND Carrera = @c;
                            IF @idg IS NULL
                            BEGIN
                                INSERT INTO Grupos (Grupo, Salon, Carrera, Semestre, Activo) VALUES (@g, 'POR ASIGNAR', @c, @s, 1);
                                SET @idg = SCOPE_IDENTITY();
                            END
                            SELECT @idg AS idgrupo;
                        `);

                    const idGrupo = resG.recordset[0].idgrupo;

                    // Insertar o actualizar en tabla Alumnos
                    await pool.request()
                        .input('iu', sql.Int, idU)
                        .input('ig', sql.Int, idGrupo)
                        .input('s', sql.Int, semestreNum)
                        .input('m', sql.VarChar, alumno.Usuario.trim())
                        .query(`
                            IF EXISTS (SELECT 1 FROM Alumnos WHERE idusuario = @iu)
                                UPDATE Alumnos SET idgrupo = @ig, Semestre = @s, activo = 1 WHERE idusuario = @iu;
                            ELSE
                                INSERT INTO Alumnos (Alumno, Semestre, idusuario, idgrupo, activo) VALUES (@m, @s, @iu, @ig, 1);
                        `);
                }

                insertados++;
            } catch (err) {
                console.error(`Error al insertar a ${alumno.Usuario}:`, err);
                errores++;
            }
        }

        res.status(200).json({
            mensaje: `Carga finalizada. Insertados: ${insertados}. Errores: ${errores}.`
        });

    } catch (error: any) {
        console.error("Error general en carga masiva:", error);
        res.status(500).json({ mensaje: error.message });
    }
});

export default router;