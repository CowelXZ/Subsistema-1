import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

const dbSettings = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER || 'localhost',
    database: process.env.DB_NAME || 'CTIRECEPDB',
    options: {
        encrypt: false,
        trustServerCertificate: true,
        instanceName: process.env.DB_INSTANCE || 'MSSQLSERVER',
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