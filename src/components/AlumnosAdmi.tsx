import React, { useState, useEffect } from 'react';
import './AlumnosAdmi.css';
import { Header } from './common/Header';

interface Alumno {
    id: number;
    nombre: string;
    matricula: string;
    carrera: string;
    salon: string;
    activo: boolean;
}

interface Grupo {
    id: number;
    nombreGrupo: string;
    semestre: string;
    activo: boolean;
    alumnos: Alumno[];
}

interface Props {
    onBack: () => void;
    onEditAlumno: (matricula: string) => void;
}

export const AlumnosAdmi: React.FC<Props> = ({ onBack, onEditAlumno }) => {
    // Estados base
    const [busqueda, setBusqueda] = useState("");
    const [expandedGroup, setExpandedGroup] = useState<number | null>(null); 
    const [grupos, setGrupos] = useState<Grupo[]>([]);
    
    // Estados de diagnóstico
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // NUEVO: Estados para Filtros y Ordenamiento
    const [mostrarFiltros, setMostrarFiltros] = useState(false);
    const [orden, setOrden] = useState<'AZ' | 'ZA' | 'MAYOR_ALUMNOS' | 'MENOR_ALUMNOS'>('AZ');
    const [soloConAlumnos, setSoloConAlumnos] = useState(false);
    const [soloActivos, setSoloActivos] = useState(false);

    useEffect(() => {
        const cargarGrupos = async () => {
            try {
                const res = await fetch('http://localhost:3000/api/alumnos-admi/grupos');
                if (res.ok) {
                    const data = await res.json();
                    setGrupos(data);
                } else {
                    const errorTexto = await res.text();
                    setError(`Error del servidor: ${res.status} - ${errorTexto}`);
                }
            } catch (err: any) {
                console.error("Error crítico de conexión:", err);
                setError("No se pudo conectar con el servidor. ¿Está encendido?");
            } finally {
                setCargando(false); 
            }
        };
        cargarGrupos();
    }, []);

    // --- MEGA LÓGICA DE FILTRADO Y ORDENAMIENTO ---
    let gruposProcesados = [...grupos];

    // 1. Aplicar Búsqueda por Texto
    if (busqueda) {
        gruposProcesados = gruposProcesados.filter(g => 
            `GRUPO ${g.nombreGrupo}`.toLowerCase().includes(busqueda.toLowerCase()) || 
            `${g.semestre} SEMESTRE`.toLowerCase().includes(busqueda.toLowerCase())
        );
    }

    // 2. Aplicar Filtros (Checkboxes)
    if (soloConAlumnos) {
        gruposProcesados = gruposProcesados.filter(g => g.alumnos.length > 0);
    }
    if (soloActivos) {
        gruposProcesados = gruposProcesados.filter(g => g.activo === true);
    }

    // 3. Aplicar Ordenamiento
    gruposProcesados.sort((a, b) => {
        if (orden === 'AZ') {
            // Ordena primero por Semestre y luego por Letra del Grupo
            if (a.semestre === b.semestre) return a.nombreGrupo.localeCompare(b.nombreGrupo);
            return parseInt(a.semestre) - parseInt(b.semestre);
        }
        if (orden === 'ZA') {
            if (a.semestre === b.semestre) return b.nombreGrupo.localeCompare(a.nombreGrupo);
            return parseInt(b.semestre) - parseInt(a.semestre);
        }
        if (orden === 'MAYOR_ALUMNOS') {
            return b.alumnos.length - a.alumnos.length;
        }
        if (orden === 'MENOR_ALUMNOS') {
            return a.alumnos.length - b.alumnos.length;
        }
        return 0;
    });

    const toggleExpand = (id: number) => setExpandedGroup(expandedGroup === id ? null : id);

    return (
        <div className="main-wrapper">
            <Header titulo="ADMINISTRACION DE ALUMNOS" onBack={onBack} />
            <main className="dashboard-grid single-column">
                
                <section className="card search-bar-card" style={{ gap: '15px' }}>
                    <div className="search-wrapper full-width">
                        <input 
                            type="text" placeholder="Buscar grupo..." className="input-field search-input" 
                            value={busqueda} onChange={(e) => setBusqueda(e.target.value.replace(/[0-9]/g, ''))} 
                        />
                        <button className="search-btn"><span className="material-icons">search</span></button>
                    </div>

                    {/* --- NUEVO: MENÚ DE FILTROS --- */}
                    <div className="filter-wrapper">
                        <button className="btn-filter" onClick={() => setMostrarFiltros(!mostrarFiltros)}>
                            <span className="material-icons">filter_list</span>
                        </button>
                        
                        {mostrarFiltros && (
                            <div className="filter-dropdown animate-fade-in">
                                <div className="filter-section">
                                    <h4>Mostrar Específicos</h4>
                                    <label className="filter-checkbox">
                                        <input 
                                            type="checkbox" 
                                            checked={soloConAlumnos} 
                                            onChange={(e) => setSoloConAlumnos(e.target.checked)} 
                                        />
                                        <span>Solo grupos con alumnos</span>
                                    </label>
                                    <label className="filter-checkbox">
                                        <input 
                                            type="checkbox" 
                                            checked={soloActivos} 
                                            onChange={(e) => setSoloActivos(e.target.checked)} 
                                        />
                                        <span>Solo grupos activos</span>
                                    </label>
                                </div>
                                <div className="filter-section" style={{ borderBottom: 'none' }}>
                                    <h4>Ordenar por</h4>
                                    <button className={`filter-option ${orden === 'AZ' ? 'selected' : ''}`} onClick={() => { setOrden('AZ'); setMostrarFiltros(false) }}>Alfabético (A-Z)</button>
                                    <button className={`filter-option ${orden === 'ZA' ? 'selected' : ''}`} onClick={() => { setOrden('ZA'); setMostrarFiltros(false) }}>Inverso (Z-A)</button>
                                    <button className={`filter-option ${orden === 'MAYOR_ALUMNOS' ? 'selected' : ''}`} onClick={() => { setOrden('MAYOR_ALUMNOS'); setMostrarFiltros(false) }}>Mayor a Menor Alumnos</button>
                                    <button className={`filter-option ${orden === 'MENOR_ALUMNOS' ? 'selected' : ''}`} onClick={() => { setOrden('MENOR_ALUMNOS'); setMostrarFiltros(false) }}>Menor a Mayor Alumnos</button>
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                {cargando && (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                        <span className="material-icons" style={{ fontSize: '40px', animation: 'pulseIcon 1.5s infinite' }}>hourglass_empty</span>
                        <h2>Cargando grupos desde la base de datos...</h2>
                    </div>
                )}

                {error && (
                    <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#fee2e2', color: '#dc2626', borderRadius: '12px' }}>
                        <span className="material-icons" style={{ fontSize: '40px' }}>error_outline</span>
                        <h2>Ocurrió un problema</h2>
                        <p>{error}</p>
                    </div>
                )}

                {/* --- LISTA DE GRUPOS --- */}
                {!cargando && !error && (
                    <div className="groups-list">
                        {gruposProcesados.length === 0 ? (
                            <div className="empty-state-group" style={{ marginTop: '20px' }}>
                                <span className="material-icons">search_off</span>
                                <p>No se encontraron grupos con esos filtros.</p>
                            </div>
                        ) : (
                            gruposProcesados.map(grupo => (
                                <div key={grupo.id} className="card group-card">
                                    <div className="group-header" onClick={() => toggleExpand(grupo.id)}>
                                        <div className="group-info">
                                            <h3>
                                                GRUPO {grupo.nombreGrupo} - {grupo.semestre}° SEMESTRE
                                                <span className="count-badge">{grupo.alumnos.length} {grupo.alumnos.length === 1 ? 'Alumno' : 'Alumnos'}</span>
                                            </h3>
                                        </div>
                                        <div className="group-actions" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                            <button className={`status-badge ${grupo.activo ? 'active' : 'inactive'}`}>{grupo.activo ? 'ACTIVO' : 'INACTIVO'}</button>
                                            <button className="btn-icon-secondary" style={{ backgroundColor: 'var(--orange)', color: 'white', border: 'none' }}>
                                                <span className="material-icons">{expandedGroup === grupo.id ? 'expand_less' : 'expand_more'}</span>
                                            </button>
                                        </div>
                                    </div>

                                    {expandedGroup === grupo.id && (
                                        <div className="group-body animate-fade-in">
                                            {grupo.alumnos.length > 0 ? (
                                                <div className="table-responsive">
                                                    <table className="alumnos-table">
                                                        <thead><tr><th>ALUMNO</th><th>MATRICULA</th><th className="text-center">ESTADO</th><th className="text-center">ACCIONES</th></tr></thead>
                                                        <tbody>
                                                            {grupo.alumnos.map(alumno => (
                                                                <tr key={alumno.id}>
                                                                    <td className="fw-bold">{alumno.nombre}<br/><small style={{ color: '#aaa', fontWeight: 'normal', fontSize: '0.80rem', display: 'block', marginTop: '3px' }}>{alumno.carrera !== 'N/A' ? alumno.carrera : 'Sin Carrera Asignada'} - {alumno.salon} <span style={{color: '#ddd', margin: '0 5px'}}>|</span></small></td>
                                                                    <td className="matricula-text">{alumno.matricula}</td>
                                                                    <td className="text-center"><button className={`status-badge ${alumno.activo ? 'active' : 'inactive'}`} style={{ padding: '4px 12px', fontSize: '0.8rem' }}>{alumno.activo ? 'ACTIVO' : 'INACTIVO'}</button></td>
                                                                    <td>
                                                                        <div className="row-actions justify-center">
                                                                            <button className="btn-mini edit" title="Editar" onClick={() => onEditAlumno(alumno.matricula)}>
                                                                                <span className="material-icons">edit</span>
                                                                            </button>
                                                                            <button className="btn-mini delete" title="Eliminar"><span className="material-icons">delete</span></button>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            ) : (
                                                <div className="empty-state-group">
                                                    <span className="material-icons">group_off</span>
                                                    <p style={{ margin: 0, fontWeight: 'bold' }}>No hay alumnos en este grupo</p>
                                                    <small>Los alumnos asignados a este grupo y semestre aparecerán aquí.</small>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                )}
            </main>
        </div>
    );
};