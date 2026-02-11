import React, { useState, useRef, useEffect } from 'react';
import './RegistroEntrada.css';
import { Header } from './common/Header';

interface Props {
    onNavigateToRegister: () => void;
    onNavigateToCarga: () => void;
    onNavigateToMaestros: () => void;
}
// ... (Interfaces AlumnoData se mantienen igual) ...
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

export const RegistroEntrada: React.FC<Props> = ({ 
    onNavigateToRegister, 
    onNavigateToCarga, 
    onNavigateToMaestros // Desestructuramos
}) => {
    // ... (Toda la lógica de useState, useRef y handleScan se queda IGUAL) ...
    const [codigo, setCodigo] = useState('');
    const [alumno, setAlumno] = useState<AlumnoData | null>(null);
    const [mensaje, setMensaje] = useState('ESPERANDO ESCANEO...');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const focusInput = () => inputRef.current?.focus();
        focusInput();
        const interval = setInterval(focusInput, 3000); 
        return () => clearInterval(interval);
    }, []);

    const handleScan = (e: React.FormEvent) => {
        e.preventDefault();
        // Lógica simulada...
        if (codigo === '12345') {
             setAlumno({
                nombre: 'HUMBERTO CALLES DÍAZ',
                matricula: '2183345',
                carrera: 'Lic. en Tecnologías',
                grupo: '8° A',
                aula: 'LABORATORIO 4',
                horario: '08:00 - 10:00',
                foto: 'https://i.pravatar.cc/400?img=11',
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

                    {/* COLUMNA IZQUIERDA */}
                    <div className="login-section left-section">
                        <div className="input-instruction">
                            <span className="material-icons icon-pulse">qr_code_scanner</span>
                            <label>ESCANEE SU CREDENCIAL</label>
                        </div>

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

                        {/* --- AQUÍ ESTÁ EL CAMBIO DE DISEÑO --- */}
                        <div className="action-buttons-grid">
                            
                            {/* Fila Superior: Registros */}
                            <button className="btn-secondary-action" onClick={onNavigateToRegister}>
                                <span className="material-icons">person_add</span>
                                Registrar Alumno
                            </button>
                            
                            <button className="btn-secondary-action" onClick={onNavigateToMaestros}>
                                <span className="material-icons">school</span>
                                Registrar Maestro
                            </button>

                            {/* Fila Inferior: Gestión (Ancho completo) */}
                            <button className="btn-secondary-action btn-full-width orange" onClick={onNavigateToCarga}>
                                <span className="material-icons">calendar_month</span>
                                Gestión de Carga Académica
                            </button>

                        </div>
                    </div>

                    {/* COLUMNA DERECHA (Se queda IGUAL) */}
                    <div className={`login-section right-section info-panel ${alumno ? 'active-scan' : 'idle-scan'}`}>
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