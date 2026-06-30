import React, { useState } from 'react';
import './InicioSesion.css';

interface Props {
    onLoginSuccess?: (rol: string) => void; 
}

export const InicioSesion: React.FC<Props> = ({ onLoginSuccess }) => {
    const [correo, setCorreo] = useState('');
    const [password, setPassword] = useState('');
    const [mostrarPassword, setMostrarPassword] = useState(false);
    const [cargando, setCargando] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');
        setCargando(true);

        try {
            const response = await fetch('http://localhost:3000/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ correo, contrasena: password })
            });

            const data = await response.json();

            if (!response.ok) {
                setErrorMsg(data.mensaje || 'Error al iniciar sesión.');
                setCargando(false);
                return;
            }

            setCargando(false);
            console.log("Bienvenido:", data.usuario); 
            // AQUÍ ESTÁ LA MAGIA: Le pasamos el rol (ADMIN, SUPERVISOR u OPERADOR)
            if (onLoginSuccess) onLoginSuccess(data.usuario.rol); 

        } catch (error) {
            console.error('Error de red:', error);
            setErrorMsg('No se pudo conectar con el servidor.');
            setCargando(false);
        }
    };

    return (
        <div className="login-bg">
            {/* --- WIDGET DEL LOGO IZQUIERDO --- */}
            <div className="login-logo-container left animate-fade-in">
                <img 
                    src="/img/logo-uat.jpeg" 
                    alt="Logo UAT" 
                    className="login-logo"
                />
            </div>

            {/* --- WIDGET DEL LOGO DERECHO --- */}
            <div className="login-logo-container right animate-fade-in">
                <img 
                    src="/img/FCAT_nuevo.jpeg" 
                    alt="Logo FCAT" 
                    className="login-logo"
                />
            </div>

            <div className="login-container animate-fade-in">
                <div className="card login-box">
                    <div className="login-header">
                        <span className="material-icons login-icon">admin_panel_settings</span>
                        <h2>INICIAR SESIÓN</h2>
                        <p>Acceso exclusivo para personal administrativo</p>
                    </div>
                    
                    {errorMsg && (
                        <div className="login-error-msg animate-fade-in">
                            <span className="material-icons">error_outline</span>
                            {errorMsg}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="login-form">
                        <div className="form-group">
                            <label>Correo Electrónico</label>
                            <div className="input-with-icon">
                                <span className="material-icons input-icon">email</span>
                                <input
                                    type="email"
                                    className="input-field"
                                    placeholder="admin@uat.edu.mx"
                                    value={correo}
                                    onChange={(e) => setCorreo(e.target.value)}
                                    required
                                    autoFocus
                                    disabled={cargando}
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Contraseña</label>
                            <div className="input-with-icon">
                                <span className="material-icons input-icon">lock</span>
                                <input
                                    type={mostrarPassword ? "text" : "password"}
                                    className="input-field password-field"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    disabled={cargando}
                                />
                                <button 
                                    type="button" 
                                    className="btn-toggle-password"
                                    onClick={() => setMostrarPassword(!mostrarPassword)}
                                    tabIndex={-1}
                                >
                                    <span className="material-icons">
                                        {mostrarPassword ? 'visibility_off' : 'visibility'}
                                    </span>
                                </button>
                            </div>
                        </div>

                        <button type="submit" className="btn-enter full-width" disabled={cargando}>
                            {cargando ? (
                                <>VERIFICANDO... <span className="material-icons rotating">sync</span></>
                            ) : (
                                <>INGRESAR <span className="material-icons">arrow_forward</span></>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};