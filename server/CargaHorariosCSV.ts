import { Router } from 'express';
import { getConnection, sql } from './database.js';

const router = Router();

router.post('/', async (req, res) => {
    try {
        const { datos } = req.body;
        if (!datos || datos.length === 0) return res.status(400).json({ mensaje: "CSV vacío." });

        const pool = await getConnection();
        if (!pool) throw new Error("Sin conexión a BD");

        let insertados = 0, errores = 0;

        for (const horario of datos) {
            if (!horario.Materia || horario.Materia.trim() === '') continue;

            try {
                // 1. Buscar al maestro por nombre para obtener su ID real
                const resultMaestro = await pool.request()
                    .input('nombre', sql.VarChar, horario.Nombre_Maestro)
                    .input('paterno', sql.VarChar, horario.Apellido_Paterno)
                    .input('materno', sql.VarChar, horario.Apellido_Materno || '')
                    .query(`
                        SELECT idMaestro FROM Maestros 
                        WHERE Nombre = @nombre 
                        AND ApellidoPaterno = @paterno 
                        AND ISNULL(ApellidoMaterno, '') = @materno
                    `);

                if (resultMaestro.recordset.length === 0) {
                    console.error(`Maestro no encontrado: ${horario.Nombre_Maestro}`);
                    errores++;
                    continue; // Saltamos este horario si no existe el maestro
                }

                const idMaestro = resultMaestro.recordset[0].idMaestro;

                // --- PASO 2: Formatear horas para SQL Server (A prueba de balas) ---
                // 1. Quitamos espacios accidentales que el usuario haya dejado en el Excel
                let inicioLimpio = horario.Hora_Inicio.trim();
                let finLimpio = horario.Hora_Fin.trim();

                // 2. Si escribieron "8:00" (4 caracteres), le ponemos el cero para que sea "08:00"
                if (inicioLimpio.length === 4) inicioLimpio = '0' + inicioLimpio;
                if (finLimpio.length === 4) finLimpio = '0' + finLimpio;

                // 3. Formato YYYYMMDD (Sin guiones), es el estándar más seguro para SQL Server
                const horaInicioStr = `19000101 ${inicioLimpio}:00`;
                const horaFinStr = `19000101 ${finLimpio}:00`;

                // 3. Registrar Horario
                await pool.request()
                    .input('idMaestro', sql.Int, idMaestro)
                    .input('materia', sql.VarChar, horario.Materia)
                    .input('hora_inicio', sql.VarChar, horaInicioStr)
                    .input('hora_fin', sql.VarChar, horaFinStr)
                    .input('grupo', sql.Char, horario.Grupo)
                    .input('semestre', sql.Int, parseInt(horario.Semestre) || 1)
                    .input('lunes', sql.TinyInt, horario.Lunes === '1' ? 1 : 0)
                    .input('martes', sql.TinyInt, horario.Martes === '1' ? 1 : 0)
                    .input('miercoles', sql.TinyInt, horario.Miercoles === '1' ? 1 : 0)
                    .input('jueves', sql.TinyInt, horario.Jueves === '1' ? 1 : 0)
                    .input('viernes', sql.TinyInt, horario.Viernes === '1' ? 1 : 0)
                    .input('idarea', sql.Int, 1) // Valor por defecto
                    .input('salon', sql.VarChar, horario.Salon || '')
                    .input('carrera', sql.VarChar, horario.Carrera || '')
                    .execute('RegistrarHorarioWeb');

                insertados++;
            } catch (err) {
                console.error(`Error en horario de ${horario.Materia}:`, err);
                errores++;
            }
        }
        res.status(200).json({ mensaje: `Carga exitosa. Insertados: ${insertados}. Errores: ${errores}` });
    } catch (error: any) {
        res.status(500).json({ mensaje: error.message });
    }
});

export default router;