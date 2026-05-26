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

router.post('/', async (req, res) => {
    try {
        const { datos } = req.body;
        if (!datos || datos.length === 0) return res.status(400).json({ mensaje: "CSV vacío." });

        const MAX_REGISTROS = 1000;
        if (datos.length > MAX_REGISTROS) {
            return res.status(400).json({ mensaje: `El archivo excede el límite de ${MAX_REGISTROS} horarios por carga.` });
        }

        const pool = await getConnection();
        if (!pool) throw new Error("Sin conexión a BD");

        let insertados = 0, errores = 0;
        // PASO 4 — Acumulador de errores por fila con detalle
        const erroresDetalle: { fila: number; materia: string; motivo: string }[] = [];

        for (let i = 0; i < datos.length; i++) {
            const horario = datos[i];

            // PASO 2 — Leer campos con getValor (trim + clave normalizada)
            const materia = getValor(horario, 'Materia');
            if (!materia) continue;

            const nombreMaestro   = getValor(horario, 'Nombre_Maestro');
            const apellidoPaterno = getValor(horario, 'Apellido_Paterno');
            const apellidoMaterno = getValor(horario, 'Apellido_Materno');
            const horaInicioRaw   = getValor(horario, 'Hora_Inicio');
            const horaFinRaw      = getValor(horario, 'Hora_Fin');
            const grupo           = getValor(horario, 'Grupo');
            const semestreNum     = parseInt(getValor(horario, 'Semestre')) || 1;
            const salon           = getValor(horario, 'Salon');
            const carrera         = getValor(horario, 'Carrera');

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

                const idMaestro = resultMaestro.recordset[0].idMaestro;

                // Formatear horas (lógica original intacta)
                let inicioLimpio = horaInicioRaw;
                let finLimpio    = horaFinRaw;
                if (inicioLimpio.length === 4) inicioLimpio = '0' + inicioLimpio;
                if (finLimpio.length === 4)    finLimpio    = '0' + finLimpio;
                const horaInicioStr = `19000101 ${inicioLimpio}:00`;
                const horaFinStr    = `19000101 ${finLimpio}:00`;

                // Registrar Horario vía SP (sin cambios)
                await pool.request()
                    .input('idMaestro',  sql.Int,     idMaestro)
                    .input('materia',    sql.VarChar,  materia)
                    .input('hora_inicio', sql.VarChar, horaInicioStr)
                    .input('hora_fin',   sql.VarChar,  horaFinStr)
                    .input('grupo',      sql.Char,     grupo)
                    .input('semestre',   sql.Int,      semestreNum)
                    .input('lunes',      sql.TinyInt,  Number(getValor(horario, 'Lunes'))     === 1 ? 1 : 0)
                    .input('martes',     sql.TinyInt,  Number(getValor(horario, 'Martes'))    === 1 ? 1 : 0)
                    .input('miercoles',  sql.TinyInt,  Number(getValor(horario, 'Miercoles')) === 1 ? 1 : 0)
                    .input('jueves',     sql.TinyInt,  Number(getValor(horario, 'Jueves'))    === 1 ? 1 : 0)
                    .input('viernes',    sql.TinyInt,  Number(getValor(horario, 'Viernes'))   === 1 ? 1 : 0)
                    .input('idarea',     sql.Int,      1)
                    .input('salon',      sql.VarChar,  salon)
                    .input('carrera',    sql.VarChar,  carrera)
                    .execute('RegistrarHorarioWeb');

                insertados++;
            } catch (err: any) {
                const motivo = err?.message || 'Error inesperado al insertar';
                console.error(`Fila ${i + 2}: Error en horario de "${materia}":`, err);
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
        console.error("Error en carga masiva de horarios:", error);
        res.status(500).json({ mensaje: "Error interno al procesar la carga. Contacta al administrador." });
    }
});

export default router;