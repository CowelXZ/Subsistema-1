import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

const dbSettings = {
    user: 'admin_bd',           // El usuario que acabamos de crear
    password: 'servicio',  // PON AQUÍ LA CONTRASEÑA QUE ESCRIBISTE (ej. 123456)
    server: 'localhost',        // Usamos localhost
    database: 'CTIRECEPDB',
    options: {
        encrypt: false,
        trustServerCertificate: true,
<<<<<<< Updated upstream
        instanceName: 'RAM',// <--- IMPORTANTE: Agregamos esto porque tu SQL no es el default
        enableArithAbort: true
=======
        instanceName: 'RAM' // <--- IMPORTANTE: Agregamos esto porque tu SQL no es el default
>>>>>>> Stashed changes
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