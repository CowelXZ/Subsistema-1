import React, { useState, useRef } from 'react';
import { Modal } from '../common/Modal';
import Papa from 'papaparse';
import './MenuDesplegable.css';
import { API_URL } from '../../config';

const columnasRequeridas: Record<string, string[]> = {
    'Alumnos': ['Usuario', 'Nombre', 'ApellidoPaterno', 'ApellidoMaterno', 'Sexo', 'Ubicacion'],
    'Maestros': ['Matricula', 'Nombre', 'ApellidoPaterno', 'ApellidoMaterno', 'Correo', 'Sexo'],
    'Materias': ['Materia', 'Nombre_Maestro', 'Apellido_Paterno', 'Apellido_Materno', 'Carrera', 'Semestre', 'Grupo'],
    'Horarios': ['Materia', 'Nombre_Maestro', 'Apellido_Paterno', 'Apellido_Materno', 'Carrera', 'Semestre', 'Grupo', 'Hora_Inicio', 'Hora_Fin', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Salon']
};

interface Props {
    onNavigateToRegister?: () => void;
    onNavigateToCarga?: () => void;
    onNavigateToMaestros?: () => void;
    onNavigateToAlumnos?: () => void;
}

export const MenuDesplegable: React.FC<Props> = ({
    onNavigateToRegister,
    onNavigateToCarga,
    onNavigateToMaestros,
    onNavigateToAlumnos
}) => {
    // --- ESTADOS ---
    const [isOpen, setIsOpen] = useState(false);
    const [tipoCarga, setTipoCarga] = useState<string | null>(null);
    const [archivoCSV, setArchivoCSV] = useState<File | null>(null);
    const [mensaje, setMensaje] = useState<{ texto: string, tipo: 'error' | 'exito' } | null>(null);
    const [procesando, setProcesando] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [csvMenuAbierto, setCsvMenuAbierto] = useState(false); // <--- Nuestro estado del Acordeón
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- FUNCIONES ---
    const handleNavigation = (navigateFn?: () => void) => {
        if (navigateFn) {
            setIsOpen(false);
            navigateFn();
        }
    };

    const abrirModalCarga = (tipo: string) => {
        setTipoCarga(tipo);
        setArchivoCSV(null);
        setMensaje(null);
        setIsOpen(false);
    };

    const handleCajaClic = () => {
        if (fileInputRef.current) fileInputRef.current.click();
    };

    const handleArchivoSeleccionado = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (!file.name.endsWith('.csv')) {
                setMensaje({ texto: "Por favor, selecciona un archivo con extensión .csv", tipo: "error" });
                setArchivoCSV(null);
                return;
            }
            setArchivoCSV(file);
            setMensaje(null);
        }
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); };
    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
    
    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) {
            if (!file.name.endsWith('.csv')) {
                setMensaje({ texto: "Por favor, selecciona un archivo con extensión .csv", tipo: "error" });
                setArchivoCSV(null);
                return;
            }
            setArchivoCSV(file);
            setMensaje(null);
        }
    };

    const descargarPlantilla = () => {
        if (!tipoCarga || !columnasRequeridas[tipoCarga]) return;
        const columnas = columnasRequeridas[tipoCarga];
        const csvContent = '\uFEFF' + columnas.join(',');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `plantilla_${tipoCarga.toLowerCase()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const procesarArchivo = () => {
        if (!archivoCSV || !tipoCarga) return;
        setProcesando(true);
        setMensaje(null);

        Papa.parse(archivoCSV, {
            header: true,
            skipEmptyLines: true,
            complete: async (resultados) => {
                const datosJson = resultados.data;
                try {
                    const endpoint = tipoCarga.toLowerCase();
                    const response = await fetch(`${API_URL}/api/csv/${endpoint}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ datos: datosJson })
                    });
                    const data = await response.json();
                    if (response.ok) {
                        setMensaje({ texto: data.mensaje || "Carga masiva exitosa", tipo: "exito" });
                        setArchivoCSV(null);
                    } else {
                        throw new Error(data.mensaje || "Error al procesar en el servidor");
                    }
                } catch (error: any) {
                    setMensaje({ texto: error.message, tipo: "error" });
                } finally {
                    setProcesando(false);
                }
            },
            error: (error) => {
                setMensaje({ texto: `Error leyendo el archivo: ${error.message}`, tipo: "error" });
                setProcesando(false);
            }
        });
    };

    return (
        <>
            <button className="btn-menu-trigger" onClick={() => setIsOpen(true)}>
                <span className="material-icons">menu</span>
            </button>

            <div className={`menu-overlay ${isOpen ? 'open' : ''}`} onClick={() => setIsOpen(false)} />

            <aside className={`menu-lateral ${isOpen ? 'open' : ''}`}>
                <div className="menu-lateral-header">
                    <button className="btn-close-lateral" onClick={() => setIsOpen(false)} title="Cerrar">
                        <span className="material-icons">close</span>
                    </button>
                    <div className="menu-lateral-title-container">
                        <span className="material-icons title-icon">dashboard</span>
                        <h2>Panel de Control</h2>
                        <p>Administración del Sistema</p>
                    </div>
                </div>

                <div className="menu-lateral-scroll">
                    {/* --- SECCIÓN 1: GESTIÓN DE USUARIOS --- */}
                    <div className="menu-section">
                        <h3 className="menu-section-title">Gestión de Usuarios</h3>
                        <ul className="menu-lateral-list">
                            <li><button className="btn-lateral-option" onClick={() => handleNavigation(onNavigateToRegister)}><span className="material-icons">person_add</span> Registrar Alumno</button></li>
                            <li><button className="btn-lateral-option" onClick={() => handleNavigation(onNavigateToMaestros)}><span className="material-icons">school</span> Registrar Maestro</button></li>
                            <li><button className="btn-lateral-option orange-variant" onClick={() => handleNavigation(onNavigateToCarga)}><span className="material-icons">admin_panel_settings</span> Adm. Maestros</button></li>
                            <li><button className="btn-lateral-option orange-variant" onClick={() => handleNavigation(onNavigateToAlumnos)}><span className="material-icons">groups</span> Adm. Alumnos</button></li>
                        </ul>
                    </div>

                    <hr className="menu-divider" />

                    {/* --- SECCIÓN 2: CARGA DE ARCHIVOS (SUBMENÚ DESPLEGABLE) --- */}
                    <div className="menu-section">
                        {/* Cabecera Clickable */}
                        <div 
                            className="menu-section-header clickable" 
                            onClick={() => setCsvMenuAbierto(!csvMenuAbierto)}
                        >
                            <h3 className="menu-section-title" style={{ margin: 0 }}>Carga Masiva CSV</h3>
                            <span className="material-icons dropdown-icon">
                                {csvMenuAbierto ? 'expand_less' : 'expand_more'}
                            </span>
                        </div>

                        {/* Lista Desplegable */}
                        {csvMenuAbierto && (
                            <ul className="menu-lateral-list submenu animate-fade-down">
                                <li><button className="btn-lateral-option submenu-btn" onClick={() => abrirModalCarga('Alumnos')}><span className="material-icons">group_add</span> CSV Alumnos</button></li>
                                <li><button className="btn-lateral-option submenu-btn" onClick={() => abrirModalCarga('Maestros')}><span className="material-icons">person_add_alt_1</span> CSV Maestros</button></li>
                                <li><button className="btn-lateral-option submenu-btn" onClick={() => abrirModalCarga('Materias')}><span className="material-icons">library_books</span> CSV Materias</button></li>
                                <li><button className="btn-lateral-option submenu-btn" onClick={() => abrirModalCarga('Horarios')}><span className="material-icons">edit_calendar</span> CSV Horarios</button></li>
                            </ul>
                        )}
                    </div>
                </div>
            </aside>

            {/* Modal de Carga de Archivos */}
            <div className="modal-carga-wrapper">
                <Modal isOpen={tipoCarga !== null} onClose={() => setTipoCarga(null)} title={`CARGA MASIVA: ${tipoCarga?.toUpperCase()}`}>
                    <div className="modal-carga-content">
                        <input
                            type="file"
                            accept=".csv"
                            ref={fileInputRef}
                            style={{ display: 'none' }}
                            onChange={handleArchivoSeleccionado}
                        />

                        <div
                            className={`upload-drop-zone ${isDragging ? 'is-dragging' : ''}`}
                            onClick={handleCajaClic}
                            onDragOver={handleDragOver}
                            onDragEnter={handleDragEnter}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                        >
                            <span className="material-icons upload-icon">
                                {archivoCSV ? 'task' : 'upload_file'}
                            </span>
                            {archivoCSV ? (
                                <p>Archivo listo: <strong>{archivoCSV.name}</strong></p>
                            ) : (
                                <p>Haz clic aquí o arrastra tu archivo para subirlo.</p>
                            )}
                            <small>Solo se aceptan archivos .CSV</small>
                        </div>

                        {mensaje && (
                            <div style={{ padding: '10px', marginBottom: '15px', borderRadius: '5px', backgroundColor: mensaje.tipo === 'error' ? '#ffebee' : '#e8f5e9', color: mensaje.tipo === 'error' ? '#c62828' : '#2e7d32', fontWeight: 'bold', textAlign: 'center' }}>
                                {mensaje.texto}
                            </div>
                        )}

                        <div className="upload-requirements-box">
                            <p className="req-title"><span className="material-icons">info</span> Estructura requerida del CSV:</p>

                            <div className="requirements-subtitle-container">
                                <p className="req-subtitle">Tu archivo debe contener exactamente estas columnas en la primera fila:</p>
                                <button className="btn-descargar-plantilla" onClick={descargarPlantilla}>
                                    <span className="material-icons">file_download</span>
                                    Descargar plantilla
                                </button>
                            </div>

                            <div className="badges-container">
                                {tipoCarga && columnasRequeridas[tipoCarga].map((col, index) => (
                                    <span key={index} className="req-badge">{col}</span>
                                ))}
                            </div>
                        </div>

                        <div className="modal-actions">
                            <button className="btn-cancelar" onClick={() => setTipoCarga(null)}>Cancelar</button>
                            <button
                                className="btn-subir"
                                disabled={!archivoCSV || procesando}
                                style={{ opacity: (!archivoCSV || procesando) ? 0.5 : 1 }}
                                onClick={procesarArchivo}
                            >
                                {procesando ? 'Procesando...' : 'Procesar Archivo'}
                            </button>
                        </div>
                    </div>
                </Modal>
            </div>
        </>
    );
};