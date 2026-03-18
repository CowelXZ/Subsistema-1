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

        for (const maestro of datos) {
            if (!maestro.Matricula || maestro.Matricula.trim() === '') continue;

            try {
                let valorSexo = 'No Binario';
                if (maestro.Sexo === 'M') valorSexo = 'Masculino';
                if (maestro.Sexo === 'F') valorSexo = 'Femenino';

                await pool.request()
                    .input('matricula', sql.VarChar, maestro.Matricula)
                    .input('nombre', sql.VarChar, maestro.Nombre)
                    .input('apellidoPaterno', sql.VarChar, maestro.ApellidoPaterno)
                    .input('apellidoMaterno', sql.VarChar, maestro.ApellidoMaterno || '')
                    .input('gradoAcademico', sql.VarChar, maestro.GradoAcademico || '')
                    .input('sexo', sql.VarChar, valorSexo)
                    .input('correo', sql.VarChar, maestro.Correo || '')
                    .input('foto', sql.VarBinary, null)
                    .execute('RegistrarMaestro');

                insertados++;
            } catch (err) {
                console.error(`Error en maestro ${maestro.Matricula}:`, err);
                errores++;
            }
        }
        res.status(200).json({ mensaje: `Carga exitosa. Insertados: ${insertados}. Errores: ${errores}` });
    } catch (error: any) {
        res.status(500).json({ mensaje: error.message });
    }
});

export default router;