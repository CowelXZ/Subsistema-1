import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config({ override: false }); // En Docker, las env vars vienen del docker-compose

const dbSettings: any = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER || 'localhost',
    database: process.env.DB_NAME || 'CTIRECEPDB',
    port: 1433,
    options: {
        encrypt: false,
        trustServerCertificate: true,
        // Solo usar instancia nombrada si DB_INSTANCE tiene valor real (no vacío)
        // En Docker se conecta directamente por puerto 1433, sin instancia
        ...(process.env.DB_INSTANCE ? { instanceName: process.env.DB_INSTANCE } : {}),
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