// src/components/RegistroEntrada.tsx
import React, { useState } from 'react';
import { Header } from './common/Header';

interface Props {
    onNavigateToRegister: () => void; // Prop para cambiar de pantalla
}

export const RegistroEntrada: React.FC<Props> = ({ onNavigateToRegister }) => {
    const [codigo, setCodigo] = useState('');

    const handleScan = (e: React.FormEvent) => {
        e.preventDefault();
        console.log("Buscando alumno con código:", codigo);
        // Aquí iría la lógica de búsqueda en la BD
    };

    return (
        <div className="main-wrapper">
            <Header titulo="Registro de Entrada" />

            <main className="main-centered">
                <section className="card login-card">

                    {/* IZQUIERDA: INPUT */}
                    <div className="login-section left-section">
                        <label className="login-label">INGRESA CLAVE O ESCANEA QR</label>

                        <form onSubmit={handleScan}>
                            <input
                                type="text"
                                placeholder="Esperando código..."
                                className="input-field big-input"
                                value={codigo}
                                onChange={(e) => setCodigo(e.target.value)}
                                autoFocus // Importante para lectores de código de barras
                            />
                        </form>

                        <button className="btn-save btn-dark" onClick={onNavigateToRegister}>
                            Registrar Nuevo Usuario
                        </button>
                    </div>

                    {/* DERECHA: FOTO ALUMNO */}
                    <div className="login-section right-section">
                        <div className="photo-placeholder">
                            <span className="material-icons user-icon">person</span>
                        </div>
                        <div className="user-info text-center">
                            <small>IDENTIFICACIÓN DE USUARIO</small>
                            <h3>ESPERANDO ESCANEO</h3>
                        </div>
                    </div>

                </section>
            </main>
        </div>
    );
};