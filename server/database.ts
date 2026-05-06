import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

// Validación temprana: si falta una variable crítica, fallamos rápido
// con un mensaje claro en lugar de un error críptico al conectar.
const requiredEnv = ['DB_USER', 'DB_PASSWORD', 'DB_SERVER', 'DB_NAME', 'DB_INSTANCE'];
for (const key of requiredEnv) {
    if (!process.env[key]) {
        throw new Error(
            `❌ Falta la variable de entorno ${key}. ` +
            `Verifica que el archivo .env existe en la raíz del proyecto y tiene esta variable definida.`
        );
    }
}

const dbSettings = {
    user: process.env.DB_USER!,
    password: process.env.DB_PASSWORD!,
    server: process.env.DB_SERVER!,
    database: process.env.DB_NAME!,
    options: {
        encrypt: false,
        trustServerCertificate: true,
        instanceName: process.env.DB_INSTANCE!,
        enableArithAbort: true
    },
};

export async function getConnection() {
    try {
        const pool = await sql.connect(dbSettings);
        return pool;
    } catch (error) {
        console.error('Error conectando a la BD:', error);
    }
}

export { sql };

