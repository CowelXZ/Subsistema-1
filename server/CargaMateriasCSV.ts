import { Router } from 'express';
import { getConnection, sql } from './database.js';

const router = Router();

// PASO 1 — Helper: resuelve un campo de la fila tolerando diferencias de casing
// y guiones bajos en el nombre de la columna del CSV (ej. "nombre_maestro" ≡ "Nombre_Maestro").
function normalizarClave(clave: string): string {
    return clave.toLowerCase().replace(/[_\s]/g, '');
}

function getValor(fila: Record<string, any>, campoEsperado: string): string {
    // Primero intento exacto (el más rápido)
    if (fila[campoEsperado] !== undefined && fila[campoEsperado] !== null) {
        return String(fila[campoEsperado]).trim();
    }
    // Si falla, busco por clave normalizada (case-insensitive, sin guiones)
    const claveNorm = normalizarClave(campoEsperado);
    for (const key of Object.keys(fila)) {
        if (normalizarClave(key) === claveNorm) {
            const val = fila[key];
            return val !== undefined && val !== null ? String(val).trim() : '';
        }
    }
    return '';
}

// Endpoint: POST /api/csv/materias
router.post('/', async (req, res) => {
    try {
        const { datos } = req.body;

        if (!datos || datos.length === 0) {
            return res.status(400).json({ mensaje: "El archivo CSV de materias está vacío o no tiene el formato correcto." });
        }

        const MAX_REGISTROS = 1000;
        if (datos.length > MAX_REGISTROS) {
            return res.status(400).json({ mensaje: `El archivo excede el límite de ${MAX_REGISTROS} materias por carga.` });
        }

        const pool = await getConnection();
        if (!pool) throw new Error("Sin conexión a BD");

        let insertados = 0;
        let errores = 0;
        // PASO 4 — Acumulador de errores por fila con detalle
        const erroresDetalle: { fila: number; materia: string; motivo: string }[] = [];

        for (let i = 0; i < datos.length; i++) {
            const fila = datos[i];

            // PASO 2 — Leer campos con getValor (trim + clave normalizada)
            const materia = getValor(fila, 'Materia');
            if (!materia) continue; // Fila fantasma: se omite silenciosamente

            const nombreMaestro  = getValor(fila, 'Nombre_Maestro');
            const apellidoPaterno = getValor(fila, 'Apellido_Paterno');
            const apellidoMaterno = getValor(fila, 'Apellido_Materno');
            const carrera        = getValor(fila, 'Carrera');
            const semestreNum    = parseInt(getValor(fila, 'Semestre')) || 1;
            const grupoLetra     = getValor(fila, 'Grupo');

            try {
                // PASO 3 — Query de maestro con COLLATE CI_AI: tolerante a
                // diferencias de acentos (García ≡ Garcia) y mayúsculas.
                const resultMaestro = await pool.request()
                    .input('nombre',  sql.VarChar, nombreMaestro)
                    .input('paterno', sql.VarChar, apellidoPaterno)
                    .input('materno', sql.VarChar, apellidoMaterno)
                    .query(`
                        SELECT idMaestro FROM Maestros
                        WHERE  Nombre           COLLATE SQL_Latin1_General_CP1_CI_AI = @nombre
                          AND  ApellidoPaterno  COLLATE SQL_Latin1_General_CP1_CI_AI = @paterno
                          AND  ISNULL(ApellidoMaterno, '') COLLATE SQL_Latin1_General_CP1_CI_AI = @materno
                          AND  Activo = 1
                    `);

                if (resultMaestro.recordset.length === 0) {
                    const motivo = `Maestro "${nombreMaestro} ${apellidoPaterno}" no encontrado en la BD`;
                    console.error(`Fila ${i + 2}: ${motivo}`);
                    erroresDetalle.push({ fila: i + 2, materia, motivo });
                    errores++;
                    continue;
                }

                const idMaestro      = resultMaestro.recordset[0].idMaestro;
                const nombreCompleto = `${nombreMaestro} ${apellidoPaterno} ${apellidoMaterno}`.trim();

                // Buscar o crear Grupo (lógica original intacta)
                const resultGrupo = await pool.request()
                    .input('grupo',    sql.Char,    grupoLetra)
                    .input('semestre', sql.Int,     semestreNum)
                    .input('carrera',  sql.VarChar, carrera)
                    .query(`
                        DECLARE @idgrupo INT;
                        SELECT @idgrupo = idgrupo FROM Grupos
                        WHERE Grupo = @grupo AND Semestre = @semestre AND Carrera = @carrera;

                        IF @idgrupo IS NULL
                        BEGIN
                            INSERT INTO Grupos (Grupo, Salon, Carrera, Semestre, Activo)
                            VALUES (@grupo, 'POR ASIGNAR', @carrera, @semestre, 1);
                            SET @idgrupo = SCOPE_IDENTITY();
                        END

                        SELECT @idgrupo AS idgrupo;
                    `);

                const idGrupo = resultGrupo.recordset[0].idgrupo;

                // Insertar en Asignaturas (lógica original intacta)
                await pool.request()
                    .input('materia',      sql.VarChar, materia)
                    .input('nombreMaestro', sql.VarChar, nombreCompleto)
                    .input('idgrupo',      sql.Int,     idGrupo)
                    .input('idMaestro',    sql.Int,     idMaestro)
                    .query(`
                        INSERT INTO Asignaturas (Materia, Maestro, idgrupo, idMaestro, activo)
                        VALUES (@materia, @nombreMaestro, @idgrupo, @idMaestro, 1);
                    `);

                insertados++;
            } catch (err: any) {
                const motivo = err?.message || 'Error inesperado al insertar';
                console.error(`Fila ${i + 2}: Error en materia "${materia}":`, err);
                erroresDetalle.push({ fila: i + 2, materia, motivo });
                errores++;
            }
        }

        // PASO 5 — Respuesta con contadores Y detalle de errores por fila
        res.status(200).json({
            mensaje: `Carga finalizada. Insertados: ${insertados}. Errores: ${errores}.`,
            insertados,
            errores,
            erroresDetalle
        });

    } catch (error: any) {
        console.error("Error general en carga masiva de materias:", error);
        res.status(500).json({ mensaje: "Error interno al procesar la carga. Contacta al administrador." });
    }
});

export default router;