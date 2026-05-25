/**
 * URL base del backend.
 * En desarrollo: lee VITE_API_URL del .env (o usa localhost:3000 por defecto).
 * En producción (Docker): se inyecta via --build-arg en el Dockerfile.
 */
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
