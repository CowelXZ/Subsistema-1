// server/middleware/errorHandler.ts
import type { Request, Response, NextFunction } from 'express';

/**
 * Middleware centralizado de manejo de errores.
 * Reemplaza los try/catch repetidos en cada ruta.
 *
 * Convierte errores de SQL Server a mensajes seguros para el cliente,
 * mientras loguea el detalle completo en consola para debugging.
 */
export function errorHandler(
    err: any,
    req: Request,
    res: Response,
    _next: NextFunction
) {
    // Log completo en servidor (incluye stack, query, etc.)
    console.error(`[ERROR ${req.method} ${req.path}]`, {
        message: err.message,
        code: err.code,
        number: err.number,
        stack: err.stack
    });

    // Errores personalizados de stored procedures (THROW 5xxxx)
    // SQL Server usa números >= 50000 para errores de usuario
    if (err.number && err.number >= 50000) {
        return res.status(400).json({
            mensaje: err.message,
            tipo: 'ERROR_NEGOCIO'
        });
    }

    // Violación de unicidad (matrícula duplicada, por ejemplo)
    if (err.number === 2627 || err.number === 2601) {
        return res.status(409).json({
            mensaje: 'El registro ya existe (matrícula o identificador duplicado).',
            tipo: 'CONFLICTO'
        });
    }

    // Violación de FK (intentas vincular a algo que no existe)
    if (err.number === 547) {
        return res.status(400).json({
            mensaje: 'Referencia inválida: el registro relacionado no existe.',
            tipo: 'FK_INVALIDA'
        });
    }

    // Error de conexión a BD
    if (err.code === 'ETIMEOUT' || err.code === 'ECONNREFUSED') {
        return res.status(503).json({
            mensaje: 'Servicio temporalmente no disponible. Intenta de nuevo en unos segundos.',
            tipo: 'BD_NO_DISPONIBLE'
        });
    }

    // Fallback: nunca expongas err.message crudo del SQL Server al cliente
    res.status(500).json({
        mensaje: 'Ocurrió un error interno. Si persiste, contacta al administrador.',
        tipo: 'ERROR_INTERNO'
    });
}
