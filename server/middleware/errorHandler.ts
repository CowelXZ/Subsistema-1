import { Request, Response, NextFunction } from 'express';

/**
 * Middleware centralizado de manejo de errores.
 * - Loguea el error completo en el servidor (para diagnóstico).
 * - Nunca expone mensajes internos de BD o stack traces al cliente.
 */
export const errorHandler = (
    err: any,
    req: Request,
    res: Response,
    _next: NextFunction
) => {
    console.error(`[ERROR] ${req.method} ${req.path}`, err?.message || err);

    // Si el error ya tiene un código HTTP asignado (ej. validaciones), úsalo
    const status = err?.status || 500;
    const mensaje = status < 500
        ? err.message // Errores de validación sí se pueden mostrar
        : 'Ocurrió un error interno. Contacta al administrador del sistema.';

    res.status(status).json({ error: mensaje });
};
