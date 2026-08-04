import React, { useEffect, useState } from 'react';
import { Header } from '../common/Header';
import { Modal } from '../common/Modal';
import { API_URL } from '../../config';

interface AccesoItem {
    idAcceso: number;
    matricula: string;
    nombreCompleto: string;
    tipoUsuario: string;
    materiaDestino: string | null;
    grupoDestino: string | null;
    maestroAsignado: string | null;
    aulaDestino: string | null;
    estatusAcceso: string;
    fechaHora: string;
}

interface Props {
    onBack: () => void;
}

export const ReportesView: React.FC<Props> = ({ onBack }) => {
    const [accesos, setAccesos] = useState<AccesoItem[]>([]);
    const [cargando, setCargando] = useState(true);

    // Filtros de la tabla principal
    const [busqueda, setBusqueda] = useState('');
    const [filtroTipo, setFiltroTipo] = useState('TODOS');

    // --- 2. ESTADOS PARA EL MODAL DE EXPORTACIÓN ---
    const [modalExportar, setModalExportar] = useState(false);
    const [tipoExportacion, setTipoExportacion] = useState('AMBOS');
    const [grupoExportacion, setGrupoExportacion] = useState('');

    useEffect(() => {
        const cargarReportes = async () => {
            try {
                const response = await fetch(`${API_URL}/api/reportes`);
                if (response.ok) {
                    const data = await response.json();
                    setAccesos(data);
                }
            } catch (error) {
                console.error("Error al cargar reportes:", error);
            } finally {
                setCargando(false);
            }
        };
        cargarReportes();
    }, []);

    const formatearFechaHora = (fechaStr: string) => {
        const fecha = new Date(fechaStr);
        return {
            fecha: fecha.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' }),
            hora: fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        };
    };

    // Filtrado en tiempo real (Para la vista)
    const registrosFiltrados = accesos.filter((acc) => {
        const textoBuscar = busqueda.toLowerCase();
        const cumpleBusqueda = 
            acc.nombreCompleto.toLowerCase().includes(textoBuscar) || 
            acc.matricula.toLowerCase().includes(textoBuscar) ||
            (acc.grupoDestino && acc.grupoDestino.toLowerCase().includes(textoBuscar));
        
        const cumpleTipo = filtroTipo === 'TODOS' || acc.tipoUsuario.toUpperCase() === filtroTipo;

        return cumpleBusqueda && cumpleTipo;
    });

    // --- 3. LÓGICA PARA GENERAR Y DESCARGAR EL CSV ---
    const generarCSV = () => {
        // Clonamos todos los datos originales
        let datosAExportar = [...accesos];

        // Aplicamos los filtros seleccionados en el modal
        if (tipoExportacion === 'ALUMNOS') {
            datosAExportar = datosAExportar.filter(a => a.tipoUsuario.toUpperCase() === 'ALUMNO');
            
            // Si el usuario escribió un grupo, filtramos más a fondo
            if (grupoExportacion.trim() !== '') {
                datosAExportar = datosAExportar.filter(a => 
                    a.grupoDestino && a.grupoDestino.toLowerCase() === grupoExportacion.trim().toLowerCase()
                );
            }
        } else if (tipoExportacion === 'MAESTROS') {
            datosAExportar = datosAExportar.filter(a => a.tipoUsuario.toUpperCase() === 'MAESTRO');
        }

        if (datosAExportar.length === 0) {
            alert("No hay registros que coincidan con los criterios seleccionados para exportar.");
            return;
        }

        // Definimos las columnas del Excel
        const cabeceras = ['Fecha', 'Hora', 'Matricula', 'Nombre_Completo', 'Tipo_Usuario', 'Estatus', 'Materia', 'Grupo', 'Aula', 'Docente_Asignado'];
        
        // Mapeamos los datos para crear las filas del CSV
        const filasCSV = datosAExportar.map(acc => {
            const { fecha, hora } = formatearFechaHora(acc.fechaHora);
            return [
                fecha,
                hora,
                acc.matricula,
                `"${acc.nombreCompleto}"`, // Protegemos textos con comillas dobles
                acc.tipoUsuario,
                acc.estatusAcceso,
                `"${acc.materiaDestino || 'N/A'}"`,
                `"${acc.grupoDestino || 'N/A'}"`,
                `"${acc.aulaDestino || 'N/A'}"`,
                `"${acc.maestroAsignado || 'N/A'}"`
            ].join(','); // Unimos por comas
        });

        // Agregamos el prefijo \uFEFF para que Excel reconozca los acentos (UTF-8)
        const csvContent = '\uFEFF' + cabeceras.join(',') + '\r\n' + filasCSV.join('\r\n');
        
        // Creamos el archivo virtual y forzamos su descarga
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        // Nombre del archivo dinámico con la fecha de hoy
        const fechaHoy = new Date().toISOString().split('T')[0];
        link.setAttribute('href', url);
        link.setAttribute('download', `Reporte_Accesos_${tipoExportacion}_${fechaHoy}.csv`);
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        // Cerramos la ventana flotante
        setModalExportar(false);
    };

    return (
        <div className="main-wrapper">
            <Header titulo="REPORTES DE ASISTENCIA Y ACCESOS" onBack={onBack} />
            
            <div className="content-container animate-fade-in" style={{ padding: '30px', paddingBottom: '100px' }}>
                
                {/* --- BARRA DE FILTROS --- */}
                <div className="card shadow-sm" style={{ padding: '20px', backgroundColor: '#ffffff', borderRadius: '12px', marginBottom: '20px', display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
                    
                    <div style={{ flex: '1', minWidth: '300px', position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <span className="material-icons" style={{ position: 'absolute', left: '12px', color: '#64748b' }}>search</span>
                        <input 
                            type="text" 
                            placeholder="Buscar por matrícula, nombre o grupo..." 
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            style={{ width: '100%', padding: '10px 12px 10px 40px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none' }}
                        />
                    </div>

                    <select 
                        value={filtroTipo}
                        onChange={(e) => setFiltroTipo(e.target.value)}
                        style={{ padding: '10px 15px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', fontSize: '0.9rem', outline: 'none', cursor: 'pointer' }}
                    >
                        <option value="TODOS">Todos los Usuarios</option>
                        <option value="ALUMNO">Solo Alumnos</option>
                        <option value="MAESTRO">Solo Maestros</option>
                    </select>

                    {/* --- BOTÓN DE EXPORTAR ACTUALIZADO --- */}
                    <button 
                        onClick={() => setModalExportar(true)}
                        style={{ padding: '10px 20px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', transition: 'background-color 0.2s' }} 
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#059669'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#10b981'}
                        title="Exportar registros a Excel (.csv)"
                    >
                        <span className="material-icons">download</span> Exportar
                    </button>
                </div>

                {/* --- TABLA DE REPORTES --- */}
                <div className="card shadow-md" style={{ padding: '20px', backgroundColor: '#ffffff', borderRadius: '12px' }}>
                    
                    {cargando ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--uat-guinda)' }}>
                            <span className="material-icons rotating" style={{ fontSize: '2.5rem' }}>sync</span>
                        </div>
                    ) : registrosFiltrados.length === 0 ? (
                        <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px' }}>
                            <span className="material-icons" style={{ fontSize: '3rem' }}>folder_off</span>
                            <p>No hay registros de asistencia con estos filtros.</p>
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table className="table-admi" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                <thead>
                                    <tr>
                                        <th>Fecha y Hora</th>
                                        <th>Matrícula / Nombre</th>
                                        <th>Tipo</th>
                                        <th>Destino / Actividad</th>
                                        <th>Estatus</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {registrosFiltrados.map((acc) => {
                                        const { fecha, hora } = formatearFechaHora(acc.fechaHora);
                                        return (
                                            <tr key={acc.idAcceso}>
                                                <td style={{ whiteSpace: 'nowrap' }}>
                                                    <div style={{ fontWeight: 'bold', color: '#334155' }}>{hora}</div>
                                                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{fecha}</div>
                                                </td>
                                                <td>
                                                    <div style={{ fontWeight: 'bold', color: 'var(--uat-guinda)' }}>{acc.matricula}</div>
                                                    <div style={{ color: '#1e293b' }}>{acc.nombreCompleto}</div>
                                                </td>
                                                <td>
                                                    <span style={{ 
                                                        padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold',
                                                        backgroundColor: acc.tipoUsuario.toUpperCase() === 'ALUMNO' ? '#e0f2fe' : '#fef3c7',
                                                        color: acc.tipoUsuario.toUpperCase() === 'ALUMNO' ? '#0369a1' : '#b45309'
                                                    }}>
                                                        {acc.tipoUsuario.toUpperCase()}
                                                    </span>
                                                </td>
                                                <td>
                                                    {acc.materiaDestino ? (
                                                        <>
                                                            <div style={{ fontWeight: '600' }}>{acc.materiaDestino} ({acc.grupoDestino})</div>
                                                            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{acc.aulaDestino} | Docente: {acc.maestroAsignado}</div>
                                                        </>
                                                    ) : (
                                                        <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Sin actividad asignada</span>
                                                    )}
                                                </td>
                                                <td>
                                                    {acc.estatusAcceso === 'PERMITIDO' ? (
                                                        <span style={{ color: '#16a34a', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            <span className="material-icons" style={{ fontSize: '1rem' }}>check_circle</span> OK
                                                        </span>
                                                    ) : (
                                                        <span style={{ color: '#dc2626', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            <span className="material-icons" style={{ fontSize: '1rem' }}>cancel</span> DENEGADO
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* --- MODAL DE EXPORTACIÓN --- */}
            <Modal isOpen={modalExportar} onClose={() => setModalExportar(false)} title="EXPORTAR REPORTES">
                <div style={{ padding: '10px' }}>
                    <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '20px' }}>
                        Seleccione los datos que desea extraer. Se generará un archivo de Excel (.csv) con el historial de asistencias de los accesos escaneados.
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        
                        {/* Selector Principal */}
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label style={{ fontWeight: 'bold', fontSize: '0.85rem', color: '#1e293b' }}>¿Qué registros desea exportar?</label>
                            <select 
                                className="input-field" 
                                value={tipoExportacion} 
                                onChange={(e) => {
                                    setTipoExportacion(e.target.value);
                                    // Si cambia y no es alumno, limpiamos el campo de grupo para evitar bugs ocultos
                                    if (e.target.value !== 'ALUMNOS') setGrupoExportacion('');
                                }}
                                style={{ backgroundColor: '#fff', cursor: 'pointer' }}
                            >
                                <option value="AMBOS">Todos los Accesos (Alumnos y Maestros)</option>
                                <option value="ALUMNOS">Solo Alumnos (Pase de Lista)</option>
                                <option value="MAESTROS">Solo Maestros</option>
                            </select>
                        </div>

                        {/* Campo dinámico: Solo aparece si selecciona "ALUMNOS" */}
                        {tipoExportacion === 'ALUMNOS' && (
                            <div className="form-group animate-fade-in" style={{ marginBottom: 0 }}>
                                <label style={{ fontWeight: 'bold', fontSize: '0.85rem', color: '#1e293b' }}>Filtrar por Grupo (Opcional)</label>
                                <input 
                                    type="text" 
                                    className="input-field" 
                                    placeholder="Ej. A, B, C, o dejar en blanco para todos los grupos" 
                                    value={grupoExportacion} 
                                    onChange={(e) => setGrupoExportacion(e.target.value)} 
                                />
                                <small style={{ color: '#64748b', marginTop: '5px', display: 'block' }}>Si lo deja vacío, se exportarán todos los alumnos de la base de datos.</small>
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '30px' }}>
                        <button className="btn-cancelar" style={{ flex: 1 }} onClick={() => setModalExportar(false)}>Cancelar</button>
                        <button 
                            className="btn-subir" 
                            style={{ flex: 1, backgroundColor: '#10b981', display: 'flex', justifyContent: 'center', gap: '8px' }} 
                            onClick={generarCSV}
                        >
                            <span className="material-icons" style={{ fontSize: '1.2rem' }}>table_view</span> Descargar CSV
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};