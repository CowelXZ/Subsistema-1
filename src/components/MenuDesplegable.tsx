import React, { useState, useRef } from 'react';
import { Modal } from './common/Modal'; // Ajusta la ruta si es necesario
import Papa from 'papaparse';
import './MenuDesplegable.css';

const columnasRequeridas: Record<string, string[]> = {
    'Alumnos': ['Usuario', 'Nombre', 'ApellidoPaterno', 'ApellidoMaterno', 'Sexo', 'Ubicacion'], 
    'Maestros': ['Matricula', 'Nombre', 'ApellidoPaterno', 'ApellidoMaterno', 'Correo', 'Sexo'],
    'Materias': ['Materia', 'Nombre_Maestro', 'Apellido_Paterno', 'Apellido_Materno', 'Carrera', 'Semestre', 'Grupo'],
    'Horarios': ['Materia', 'Nombre_Maestro', 'Apellido_Paterno', 'Apellido_Materno', 'Carrera', 'Semestre', 'Grupo', 'Hora_Inicio', 'Hora_Fin', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Salon']
};

export const MenuDesplegable: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [tipoCarga, setTipoCarga] = useState<string | null>(null);
    const [archivoCSV, setArchivoCSV] = useState<File | null>(null);
    const [mensaje, setMensaje] = useState<{ texto: string, tipo: 'error' | 'exito' } | null>(null);
    const [procesando, setProcesando] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    // --- EVENTOS DRAG & DROP ---
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault(); // Evita que el navegador abra el archivo por defecto
        e.stopPropagation();
    };

    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true); // El archivo entró a la zona, encendemos el efecto visual
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false); // El archivo salió de la zona, apagamos el efecto
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false); // Apagamos el efecto porque ya soltó el archivo

        // Capturamos el archivo que se soltó
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

    // NUEVO: La magia para fabricar y descargar la plantilla CSV al instante
    const descargarPlantilla = () => {
        if (!tipoCarga || !columnasRequeridas[tipoCarga]) return;

        // 1. Obtenemos las columnas exactas para este tipo (ej: Alumnos)
        const columnas = columnasRequeridas[tipoCarga];

        // 2. Creamos la primera fila uniendo las columnas con comas
        // El '\uFEFF' al principio es un truco para que Excel reconozca acentos automáticamente
        const csvContent = '\uFEFF' + columnas.join(',');

        // 3. Convertimos el texto en un "Blob" (un archivo binario falso en memoria)
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

        // 4. Creamos una URL temporal para ese archivo
        const url = URL.createObjectURL(blob);

        // 5. Creamos un enlace invisible, le damos clic para descargar y lo borramos
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `plantilla_${tipoCarga.toLowerCase()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Limpiamos la URL temporal
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
                    // Magia: Convertimos el tipo de carga (Ej: 'Maestros') a minúsculas para la URL
                    const endpoint = tipoCarga.toLowerCase(); 
                    
                    const response = await fetch(`http://localhost:3000/api/csv/${endpoint}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        // Enviamos el arreglo siempre con el nombre "datos" para estandarizar
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
                        <span className="material-icons title-icon">edit_document</span>
                        <h2>Carga de Archivos</h2>
                        <p>Gestión de documentos</p>
                    </div>
                </div>

                <ul className="menu-lateral-list">
                    <li><button className="btn-lateral-option" onClick={() => abrirModalCarga('Alumnos')}><span className="material-icons">group_add</span> CSV Alumnos</button></li>
                    <li><button className="btn-lateral-option" onClick={() => abrirModalCarga('Maestros')}><span className="material-icons">person_add_alt_1</span> CSV Maestros</button></li>
                    <li><button className="btn-lateral-option" onClick={() => abrirModalCarga('Materias')}><span className="material-icons">library_books</span> CSV Materias</button></li>
                    <li><button className="btn-lateral-option" onClick={() => abrirModalCarga('Horarios')}><span className="material-icons">edit_calendar</span> CSV Horarios</button></li>
                </ul>
            </aside>

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

                        {/* Zona de Arrastrar y Soltar con onClick y eventos Drag & Drop */}
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
                            
                            {/* NUEVO: Contenedor para el subtítulo y el nuevo botón de descargar */}
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