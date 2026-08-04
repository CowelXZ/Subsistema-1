import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'Firma_Super_Segura_UAT_2026';
export interface RequestConUsuario extends Request {
    usuario?: any;
}

export const verificarToken = (req: RequestConUsuario, res: Response, next: NextFunction): void => {
    const authHeader = req.headers['authorization'];

    if (!authHeader) {
        res.status(403).json({ mensaje: 'Acceso denegado. No se proporcionó un token.' });
        return;
    }
    const token = authHeader.split(' ')[1]; 

    try {
        const decodificado = jwt.verify(token, JWT_SECRET);
        req.usuario = decodificado;
        next(); 
    } catch (error) {
        res.status(401).json({ mensaje: 'Token inválido o expirado. Inicia sesión nuevamente.' });
        return;
    }
};