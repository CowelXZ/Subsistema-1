import React, { useState, useRef, useEffect } from 'react';
import { Header } from './common/Header';

interface Props {
    onNavigateToRegister: () => void;
    onNavigateToCarga: () => void;
}

// Estructura de datos completa del alumno
interface AlumnoData {
    nombre: string;
    matricula: string;
    grupo: string;
    carrera: string;
    aula: string;
    horario: string;
    foto?: string;
    statusAcceso: 'PERMITIDO' | 'DENEGADO';
}

export const RegistroEntrada: React.FC<Props> = ({ onNavigateToRegister, onNavigateToCarga }) => {
    const [codigo, setCodigo] = useState('');
    const [alumno, setAlumno] = useState<AlumnoData | null>(null);
    const [mensaje, setMensaje] = useState('ESPERANDO ESCANEO...');
    
    const inputRef = useRef<HTMLInputElement>(null);

    // Mantiene el foco siempre en el input
    useEffect(() => {
        const focusInput = () => inputRef.current?.focus();
        focusInput();
        // Reintentar foco cada cierto tiempo por si el usuario hace clic fuera
        const interval = setInterval(focusInput, 3000); 
        return () => clearInterval(interval);
    }, []);

    const handleScan = (e: React.FormEvent) => {
        e.preventDefault();
        
        // --- SIMULACIÓN DE RESPUESTA DE BASE DE DATOS ---
        if (codigo === '12345') {
            setAlumno({
                nombre: 'HUMBERTO CALLES DÍAZ',
                matricula: '2183345',
                carrera: 'Lic. en Tecnologías',
                grupo: '8° A',
                aula: 'LABORATORIO 4 (CÓMPUTO)',
                horario: '08:00 - 10:00',
                foto: 'https://i.pravatar.cc/400?img=11', // Foto de alta resolución
                statusAcceso: 'PERMITIDO'
            });
            setMensaje('');
        } else {
            setAlumno(null);
            setMensaje('❌ CÓDIGO NO ENCONTRADO');
        }
        setCodigo('');
    };

    return (
        <div className="main-wrapper">
            <Header titulo="CONTROL DE ACCESO E IDENTIFICACIÓN" />

            <main className="main-centered">
                <section className="card login-card wide-card">

                    {/* --- COLUMNA IZQUIERDA: INPUT Y CONTROLES --- */}
                    <div className="login-section left-section">
                        <div className="input-instruction">
                            <span className="material-icons icon-pulse">qr_code_scanner</span>
                            <label>ESCANEE SU CREDENCIAL</label>
                        </div>

                        {/* Formulario con Input + Botón ENTRAR */}
                        <form onSubmit={handleScan} className="scan-form">
                            <input
                                ref={inputRef}
                                type="text"
                                placeholder="..."
                                className="input-field big-input scanner-input"
                                value={codigo}
                                onChange={(e) => setCodigo(e.target.value)}
                                autoFocus 
                                autoComplete="off"
                            />
                            
                            <button type="submit" className="btn-enter">
                                ENTRAR <span className="material-icons">login</span>
                            </button>
                        </form>

                        {/* Botones secundarios (Gestión) */}
                        <div className="action-buttons-stack">
                            <button className="btn-save btn-dark" onClick={onNavigateToRegister}>
                                Registrar Nuevo Usuario
                            </button>
                            <button className="btn-save btn-orange" onClick={onNavigateToCarga}>
                                Gestión de Carga
                            </button>
                        </div>
                    </div>

                    {/* --- COLUMNA DERECHA: INFORMACIÓN DEL ALUMNO --- */}
                    <div className={`login-section right-section info-panel ${alumno ? 'active-scan' : 'idle-scan'}`}>
                        
                        {/* Marco de foto gigante */}
                        <div className="photo-frame">
                            {alumno ? (
                                <img src={alumno.foto} alt="Foto alumno" className="user-photo-real" />
                            ) : (
                                <span className="material-icons user-icon-big">person_outline</span>
                            )}
                        </div>

                        <div className="user-display-info">
                            {alumno ? (
                                <>
                                    <h2 className="student-name">{alumno.nombre}</h2>
                                    <div className="access-badge pulse-animation">{alumno.statusAcceso}</div>

                                    <div className="details-grid">
                                        <div className="detail-item">
                                            <span className="label">MATRÍCULA</span>
                                            <span className="value">{alumno.matricula}</span>
                                        </div>
                                        <div className="detail-item">
                                            <span className="label">GRUPO/CARRERA</span>
                                            <span className="value">{alumno.grupo} - {alumno.carrera}</span>
                                        </div>
                                        <div className="detail-item full-width-item highlight-item">
                                            <span className="label">AULA ASIGNADA</span>
                                            <span className="value">{alumno.aula}</span>
                                        </div>
                                        <div className="detail-item full-width-item">
                                            <span className="label">HORARIO ACTUAL</span>
                                            <span className="value">{alumno.horario}</span>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="idle-message">
                                    <h3>{mensaje}</h3>
                                    <p>Acerque su código QR al lector o ingrese su matrícula manualmente.</p>
                                </div>
                            )}
                        </div>
                    </div>

                </section>
            </main>
        </div>
    );
};