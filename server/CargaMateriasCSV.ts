import { Router } from 'express';
import { getConnection, sql } from './database.js';

const router = Router();

// Endpoint: POST /api/csv/materias
router.post('/', async (req, res) => {
    try {
        const { datos } = req.body;

        if (!datos || datos.length === 0) {
            return res.status(400).json({ mensaje: "El archivo CSV de materias está vacío o no tiene el formato correcto." });
        }

        const pool = await getConnection();
        if (!pool) throw new Error("Sin conexión a BD");

        let insertados = 0;
        let errores = 0;

        // Iteramos sobre cada fila del Excel
        for (const fila of datos) {
            // Escudo contra filas fantasma
            if (!fila.Materia || fila.Materia.trim() === '') {
                continue; 
            }

            try {
                // --- PASO 1: Buscar al Maestro para obtener su idMaestro ---
                const resultMaestro = await pool.request()
                    .input('nombre', sql.VarChar, fila.Nombre_Maestro)
                    .input('paterno', sql.VarChar, fila.Apellido_Paterno)
                    .input('materno', sql.VarChar, fila.Apellido_Materno || '')
                    .query(`
                        SELECT idMaestro FROM Maestros 
                        WHERE Nombre = @nombre 
                        AND ApellidoPaterno = @paterno 
                        AND ISNULL(ApellidoMaterno, '') = @materno
                    `);

                if (resultMaestro.recordset.length === 0) {
                    console.error(`Error: Maestro no encontrado -> ${fila.Nombre_Maestro} ${fila.Apellido_Paterno}`);
                    errores++;
                    continue; // Saltamos esta materia porque no podemos dejarla huérfana
                }

                const idMaestro = resultMaestro.recordset[0].idMaestro;
                const nombreCompleto = `${fila.Nombre_Maestro} ${fila.Apellido_Paterno} ${fila.Apellido_Materno || ''}`.trim();

                // --- PASO 2: Lógica inteligente para Grupos (Buscar o Crear) ---
                const semestreNum = parseInt(fila.Semestre) || 1;
                
                const resultGrupo = await pool.request()
                    .input('grupo', sql.Char, fila.Grupo)
                    .input('semestre', sql.Int, semestreNum)
                    .input('carrera', sql.VarChar, fila.Carrera)
                    .query(`
                        DECLARE @idgrupo INT;
                        SELECT @idgrupo = idgrupo FROM Grupos 
                        WHERE Grupo = @grupo AND Semestre = @semestre AND Carrera = @carrera;

                        -- Si el grupo no existe, lo creamos
                        IF @idgrupo IS NULL
                        BEGIN
                            INSERT INTO Grupos (Grupo, Salon, Carrera, Semestre, Activo)
                            VALUES (@grupo, 'POR ASIGNAR', @carrera, @semestre, 1);
                            SET @idgrupo = SCOPE_IDENTITY();
                        END

                        SELECT @idgrupo AS idgrupo;
                    `);
                
                const idGrupo = resultGrupo.recordset[0].idgrupo;

                // --- PASO 3: Insertar finalmente en la tabla Asignaturas ---
                await pool.request()
                    .input('materia', sql.VarChar, fila.Materia)
                    .input('nombreMaestro', sql.VarChar, nombreCompleto) // Por si aún usas esa columna
                    .input('idgrupo', sql.Int, idGrupo)
                    .input('idMaestro', sql.Int, idMaestro)
                    .query(`
                        INSERT INTO Asignaturas (Materia, Maestro, idgrupo, idMaestro, activo)
                        VALUES (@materia, @nombreMaestro, @idgrupo, @idMaestro, 1);
                    `);

                insertados++;
            } catch (err) {
                console.error(`Error al procesar la materia ${fila.Materia}:`, err);
                errores++;
            }
        }

        res.status(200).json({ 
            mensaje: `Carga finalizada exitosamente. Materias insertadas: ${insertados}. Errores: ${errores}.` 
        });

    } catch (error: any) {
        console.error("Error general en carga masiva de materias:", error);
        res.status(500).json({ mensaje: error.message });
    }
});

export default router;