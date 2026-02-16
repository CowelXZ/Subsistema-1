import React, { useState, useRef, useEffect } from 'react';
import './RegistroEntrada.css';
import { Header } from './common/Header';

interface Props {
    onNavigateToRegister: () => void;
    onNavigateToCarga: () => void;
    onNavigateToMaestros: () => void;
}

// Interfaz que unifica Datos Personales + Datos de Horario en Tiempo Real
interface UsuarioData {
    nombreCompleto: string;
    codigo: string;       // Matrícula o Usuario
    puesto: string;       // Alumno, Docente, Admin...
    ubicacion: string;    // Carrera o Departamento (LNI, LA...)
    foto?: string;        // Base64
    statusAcceso: 'PERMITIDO' | 'DENEGADO';

    // Datos Dinámicos del Horario (SP BuscarHorarioByUserAndDate)
    materiaActual: string;
    aulaActual: string;
    maestroActual: string;
    grupo: string;
    horarioClase: string; // Ej: "08:00 - 09:00"
}

export const RegistroEntrada: React.FC<Props> = ({
    onNavigateToRegister,
    onNavigateToCarga,
    onNavigateToMaestros
}) => {
    const [codigoInput, setCodigoInput] = useState('');
    const [usuario, setUsuario] = useState<UsuarioData | null>(null);
    const [mensaje, setMensaje] = useState('ESPERANDO ESCANEO...');

    // Referencia para mantener el foco siempre en el input (modo kiosco)
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const focusInput = () => inputRef.current?.focus();
        focusInput();
        // Reintentar foco cada 3 segs por si el usuario hace click fuera
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
                let grupoReal = dataUser.Ubicacion || "General"; // Si no hay grupo, usamos la carrera
                let horaClase = "-- : --";

                // -----------------------------------------------------------
                // PASO 2: Buscar Horario Actual (SP BuscarHorarioByUserAndDate)
                // -----------------------------------------------------------
                // Solo buscamos horario si encontramos al usuario
                if (dataUser.idUsuario) {
                    try {
                        const resHorario = await fetch(`http://localhost:3000/api/horario/${dataUser.idUsuario}`);

                        if (resHorario.ok) {
                            const dataHorario = await resHorario.json();

                            // Si el SP devolvió un objeto (no null), es que TIENE CLASE AHORA
                            if (dataHorario) {
                                materia = dataHorario.Materia;
                                maestro = dataHorario.Maestro;
                                // Ajuste por si el idArea es numérico en BD
                                aula = `AULA ${dataHorario.idArea}`;
                                grupoReal = dataHorario.Grupo;
                                // Si tu SP devolviera horas, las pondríamos aquí, si no, lo dejamos genérico o calculado
                                horaClase = "EN CURSO";
                            }
                        }
                    } catch (err) {
                        console.error("Error consultando horario secundario:", err);
                        // No bloqueamos el acceso, solo mostramos datos básicos
                    }
                }

                // -----------------------------------------------------------
                // PASO 3: Construir el Objeto Final para la Vista
                // -----------------------------------------------------------
                const usuarioEncontrado: UsuarioData = {
                    nombreCompleto: `${dataUser.Nombre} ${dataUser.ApellidoPaterno} ${dataUser.ApellidoMaterno || ''}`.trim(),
                    codigo: dataUser.Usuario,
                    puesto: dataUser.Puesto || 'Usuario',
                    ubicacion: dataUser.Ubicacion || 'Sin Asignar',
                    foto: dataUser.Foto || undefined, // Viene en Base64 desde el backend

                    // Lógica de acceso: Si Activo=1 -> Permitido, si no -> Denegado
                    statusAcceso: dataUser.Activo === 1 ? 'PERMITIDO' : 'DENEGADO',

                    // Datos calculados del horario
                    materiaActual: materia,
                    aulaActual: aula,
                    maestroActual: maestro,
                    grupo: grupoReal,
                    horarioClase: horaClase
                };

                setUsuario(usuarioEncontrado);
                setMensaje(''); // Borramos mensaje de carga
            } else {
                // Si el primer fetch falla (404)
                setUsuario(null);
                setMensaje('❌ USUARIO NO ENCONTRADO');
            }
        } catch (error) {
            console.error("Error crítico de conexión:", error);
            setMensaje('⚠️ ERROR DE CONEXIÓN CON SERVIDOR');
        }

        setCodigoInput(''); // Limpiar input para el siguiente escaneo rápido
    };

    return (
        <div className="main-wrapper">
            <Header titulo="CONTROL DE ACCESO E IDENTIFICACIÓN" />

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
                                Escanear <span className="material-icons">login</span>
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
                                <span className="material-icons">calendar_month</span>
                                Gestión de Carga Académica
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

                                    {/* Badge de Estado: Verde o Rojo */}
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

                                        {/* AULA (Dato Real del SP) */}
                                        <div className="detail-item full-width-item highlight-item">
                                            <span className="label">UBICACIÓN ACTUAL</span>
                                            <span className="value">{usuario.aulaActual}</span>
                                        </div>

                                        {/* MATERIA (Dato Real del SP) */}
                                        <div className="detail-item full-width-item">
                                            <span className="label">ACTIVIDAD / MATERIA ACTUAL</span>
                                            <div className="value">{usuario.materiaActual}</div>

                                            {/* Solo mostramos maestro si existe una clase asignada */}
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