import { Router } from 'express';
import { getConnection, sql } from '../database.js';

const router = Router();

// 1. Carreras (Extraídas dinámicamente de los Grupos activos)
router.get('/carreras', async (req, res) => {
    try {
        const pool = await getConnection();
        const result = await pool?.request().query(`
            SELECT 
                ROW_NUMBER() OVER (ORDER BY Carrera) AS idCarrera,
                Carrera AS NombreCarrera,
                Carrera AS Abreviatura
            FROM (
                SELECT DISTINCT Carrera
                FROM Grupos
                WHERE Activo = 1 AND Carrera IS NOT NULL AND Carrera != ''
            ) AS SubConsulta
        `);
        res.json(result?.recordset);
    } catch (error: any) { res.status(500).send(error.message); }
});

// 2. Semestres (VERSIÓN CORREGIDA: Sin alias, como lo espera el frontend)
router.get('/semestres', async (req, res) => {
    try {
        const pool = await getConnection();
        const result = await pool?.request().query(`
            SELECT DISTINCT Semestre 
            FROM Grupos 
            WHERE Activo = 1 AND Semestre > 0 
            ORDER BY Semestre ASC
        `);
        res.json(result?.recordset);
    } catch (error: any) { res.status(500).send(error.message); }
});

// 3. Áreas (Esta sí tiene su propia tabla)
router.get('/areas', async (req, res) => {
    try {
        const pool = await getConnection();
        const result = await pool?.request().query('SELECT idArea, Area, Observaciones FROM Areas WHERE Activo = 1');
        res.json(result?.recordset);
    } catch (error: any) { res.status(500).send(error.message); }
});

// 4. Letras de Grupos (A, B, C...)
router.get('/grupos-letras', async (req, res) => {
    try {
        const pool = await getConnection();
        const result = await pool?.request().query(`
            SELECT DISTINCT Grupo 
            FROM Grupos 
            WHERE Activo = 1 AND Grupo IS NOT NULL AND Grupo <> ''
            ORDER BY Grupo ASC
        `);
        res.json(result?.recordset);
    } catch (error: any) { res.status(500).send(error.message); }
});

// 5. Materias (Desde la tabla Asignaturas)
router.get('/materias', async (req, res) => {
    try {
        const pool = await getConnection();
        const result = await pool?.request().query(`
            SELECT DISTINCT Materia 
            FROM Asignaturas 
            WHERE activo = 1 
            ORDER BY Materia ASC
        `);
        res.json(result?.recordset);
    } catch (error: any) { res.status(500).send(error.message); }
});

export default router;