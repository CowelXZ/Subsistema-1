import { Request, Response, NextFunction } from 'express';

/**
 * Middleware reutilizable para validar que parámetros de ruta
 * usados como IDs numéricos sean enteros positivos válidos.
 *
 * Uso: router.delete('/:id', validateId('id'), handler)
 */
export const validateId = (...params: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        for (const param of params) {
            const val = parseInt(req.params[param]);
            if (isNaN(val) || val <= 0) {
                res.status(400).json({ error: `El parámetro '${param}' debe ser un número entero positivo.` });
                return;
            }
        }
        next();
    };
};
