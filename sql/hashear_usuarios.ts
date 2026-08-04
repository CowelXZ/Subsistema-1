/**
 * Script de un solo uso: actualiza las contraseñas de los usuarios de prueba
 * para que sean hashes bcrypt válidos (ya que fueron insertadas como texto plano).
 * 
 * Uso: npx tsx sql/hashear_usuarios.ts
 */

import bcrypt from 'bcryptjs';
import { getConnection, sql } from '../server/database.js';

const SALT_ROUNDS = 10;

const usuarios = [
    { correo: 'prueba@gmail.com',      nuevaContrasena: '123456' },
    { correo: 'supervisor@gmail.com',  nuevaContrasena: '123456' },
    { correo: 'operador@gmail.com',    nuevaContrasena: '123456' },
];

async function hashearUsuarios() {
    console.log('Conectando a la base de datos...');
    const pool = await getConnection();
    if (!pool) throw new Error('No se pudo conectar a la BD');

    for (const u of usuarios) {
        const hash = await bcrypt.hash(u.nuevaContrasena, SALT_ROUNDS);
        await pool.request()
            .input('hash', sql.VarChar, hash)
            .input('correo', sql.VarChar, u.correo)
            .query(`UPDATE UsuariosSistema SET contrasena = @hash WHERE correo = @correo`);
        console.log(`✅ ${u.correo} → contraseña hasheada`);
    }

    console.log('\n✅ Todas las contraseñas actualizadas. Ya puedes hacer login.');
    process.exit(0);
}

hashearUsuarios().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
