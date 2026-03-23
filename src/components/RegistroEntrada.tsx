import React, { useState, useRef, useEffect } from 'react';
import './RegistroEntrada.css';
import { Header } from './common/Header';
import { MenuDesplegable } from "./MenuDesplegable";

interface Props {
    onNavigateToRegister: () => void;
    onNavigateToCarga: () => void;
    onNavigateToMaestros: () => void;
    onNavigateToAlumnos: () => void; // <--- NUEVA PROP
}

interface UsuarioData {
    nombreCompleto: string;
    codigo: string;
    puesto: string;
    ubicacion: string;
    foto?: string;
    statusAcceso: 'PERMITIDO' | 'DENEGADO';
    materiaActual: string;
    aulaActual: string;
    maestroActual: string;
    grupo: string;
    horarioClase: string;
}

export const RegistroEntrada: React.FC<Props> = ({
    onNavigateToRegister,
    onNavigateToCarga,
    onNavigateToMaestros,
    onNavigateToAlumnos // <--- RECIBIMOS LA PROP
}) => {
    const [codigoInput, setCodigoInput] = useState('');
    const [usuario, setUsuario] = useState<UsuarioData | null>(null);
    const [mensaje, setMensaje] = useState('ESPERANDO ESCANEO...');

    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const focusInput = () => inputRef.current?.focus();
        focusInput();
        const interval = setInterval(focusInput, 3000);
        return () => clearInterval(interval);
    }, []);

    const handleScan = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!codigoInput.trim()) return;

        setMensaje('BUSCANDO EN BD...');
        setUsuario(null); // Limpiamos la pantalla anterior

        try {
            // -----------------------------------------------------------
            // PASO 1: Buscar Identidad del Usuario (SP BuscarUsuario)
            // -----------------------------------------------------------
            const resUser = await fetch(`http://localhost:3000/api/usuarios/${codigoInput}`);

            if (resUser.ok) {
                const dataUser = await resUser.json();

                // Valores por defecto (si no tiene clase ahora)
                let materia = "SIN ACTIVIDAD ASIGNADA";
                let aula = "ÁREA COMÚN / LIBRE";
                let maestro = "";
                let grupoReal = dataUser.grupo || "General";
                let horaClase = "-- : --";

                // -----------------------------------------------------------
                // PASO 2: Buscar Horario Actual (SP BuscarHorarioByUserAndDate)
                // -----------------------------------------------------------
                if (dataUser.idUsuario) {
                    try {
                        const resHorario = await fetch(`http://localhost:3000/api/horario/${dataUser.idUsuario}`);

                        if (resHorario.ok) {
                            const dataHorario = await resHorario.json();
                            if (dataHorario) {
                                materia = dataHorario.Materia;
                                maestro = dataHorario.Maestro;
                                aula = `AULA ${dataHorario.idArea}`;
                                grupoReal = dataHorario.Grupo;
                                horaClase = "EN CURSO";
                            }
                        }
                    } catch (err) {
                        console.error("Error consultando horario secundario:", err);
                    }
                }

                // -----------------------------------------------------------
                // PASO 3: Construir el Objeto Final para la Vista
                // -----------------------------------------------------------
                const usuarioEncontrado: UsuarioData = {
                    nombreCompleto: `${dataUser.nombres || ''} ${dataUser.apellidoPaterno || ''} ${dataUser.apellidoMaterno || ''}`.trim(),
                    codigo: dataUser.matricula || '',

                    puesto: dataUser.Puesto || 'ALUMNO',
                    ubicacion: dataUser.carrera || 'Sin Asignar',

                    foto: dataUser.foto || undefined,
                    statusAcceso: dataUser.statusAcceso === 'denegado' ? 'DENEGADO' : 'PERMITIDO',
                    materiaActual: materia,
                    aulaActual: aula,
                    maestroActual: maestro,
                    grupo: grupoReal,
                    horarioClase: horaClase
                };

                setUsuario(usuarioEncontrado);
                setMensaje('');
            } else {
                setUsuario(null);
                setMensaje('❌ USUARIO NO ENCONTRADO');
            }
        } catch (error) {
            console.error("Error crítico de conexión:", error);
            setMensaje('⚠️ ERROR DE CONEXIÓN CON SERVIDOR');
        }

        setCodigoInput('');
    };

    return (
        <div className="main-wrapper">
            <Header titulo="CONTROL DE ACCESO E IDENTIFICACIÓN" rightAction={<MenuDesplegable />} />

            <main className="main-centered">
                <section className="card login-card wide-card">

                    {/* --- COLUMNA IZQUIERDA: FORMULARIO Y MENÚ --- */}
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
                                value={codigoInput}
                                onChange={(e) => setCodigoInput(e.target.value)}
                                autoFocus
                                autoComplete="off"
                            />
                            <button type="submit" className="btn-enter">
                                ENTRAR <span className="material-icons">login</span>
                            </button>
                        </form>

                        <div className="action-buttons-grid">
                            <button className="btn-secondary-action" onClick={onNavigateToRegister}>
                                <span className="material-icons">person_add</span>
                                Registrar Alumno
                            </button>

                            <button className="btn-secondary-action" onClick={onNavigateToMaestros}>
                                <span className="material-icons">school</span>
                                Registrar Maestro
                            </button>

                            <button className="btn-secondary-action btn-full-width orange" onClick={onNavigateToCarga}>
                                <span className="material-icons">admin_panel_settings</span>
                                Administración de Maestros
                            </button>

                            {/* --- NUEVO BOTÓN PARA ALUMNOS ADMI --- */}
                            <button className="btn-secondary-action btn-full-width orange" onClick={onNavigateToAlumnos}>
                                <span className="material-icons">groups</span>
                                Administración de Alumnos
                            </button>
                        </div>
                    </div>

                    {/* --- COLUMNA DERECHA: RESULTADO VISUAL --- */}
                    <div className={`login-section right-section info-panel ${usuario ? 'active-scan' : 'idle-scan'}`}>

                        <div className="photo-frame">
                            {usuario && usuario.foto ? (
                                <img src={usuario.foto} alt="Foto usuario" className="user-photo-real" />
                            ) : (
                                <span className="material-icons user-icon-big">person_outline</span>
                            )}
                        </div>

                        <div className="user-display-info">
                            {usuario ? (
                                <>
                                    <h2 className="student-name">{usuario.nombreCompleto}</h2>

                                    <div
                                        className="access-badge pulse-animation"
                                        style={{ backgroundColor: usuario.statusAcceso === 'PERMITIDO' ? 'var(--success)' : 'var(--danger)' }}
                                    >
                                        {usuario.statusAcceso}
                                    </div>

                                    <div className="details-grid">
                                        <div className="detail-item">
                                            <span className="label">MATRÍCULA / PUESTO</span>
                                            <span className="value">{usuario.codigo} - {usuario.puesto}</span>
                                        </div>
                                        <div className="detail-item">
                                            <span className="label">GRUPO / CARRERA</span>
                                            <span className="value">{usuario.grupo} - {usuario.ubicacion}</span>
                                        </div>

                                        <div className="detail-item full-width-item highlight-item">
                                            <span className="label">UBICACIÓN ACTUAL</span>
                                            <span className="value">{usuario.aulaActual}</span>
                                        </div>

                                        <div className="detail-item full-width-item">
                                            <span className="label">ACTIVIDAD / MATERIA ACTUAL</span>
                                            <div className="value">{usuario.materiaActual}</div>

                                            {usuario.maestroActual && (
                                                <small style={{ color: '#666', display: 'block', marginTop: '5px', fontSize: '0.9rem' }}>
                                                    Docente: {usuario.maestroActual}
                                                </small>
                                            )}
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