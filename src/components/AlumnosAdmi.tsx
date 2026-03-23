import React, { useState, useEffect } from 'react';
import './AlumnosAdmi.css';
import { Header } from './common/Header';

interface Alumno { id: number; nombre: string; matricula: string; carrera: string; salon: string; activo: boolean; }
interface Grupo { id: number; nombreGrupo: string; semestre: string; activo: boolean; alumnos: Alumno[]; }
interface Props { onBack: () => void; onEditAlumno: (matricula: string) => void; }

export const AlumnosAdmi: React.FC<Props> = ({ onBack, onEditAlumno }) => {
    const [busqueda, setBusqueda] = useState("");
    const [expandedGroup, setExpandedGroup] = useState<number | null>(null);
    const [grupos, setGrupos] = useState<Grupo[]>([]);

    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [mostrarFiltros, setMostrarFiltros] = useState(false);
    const [orden, setOrden] = useState<'AZ' | 'ZA' | 'MAYOR_ALUMNOS' | 'MENOR_ALUMNOS'>('AZ');
    const [soloConAlumnos, setSoloConAlumnos] = useState(false);
    const [soloActivos, setSoloActivos] = useState(false);

    const [modalActividad, setModalActividad] = useState<{
        visible: boolean, tipo: 'grupo' | 'alumno' | null, idTarget: number | null, nombreTarget: string, estadoActual: boolean
    }>({ visible: false, tipo: null, idTarget: null, nombreTarget: '', estadoActual: false });

    const cargarGrupos = async (mostrarCargando = true) => {
        if (mostrarCargando) setCargando(true);
        try {
            const res = await fetch('http://localhost:3000/api/alumnos-admi/grupos');
            if (res.ok) setGrupos(await res.json());
            else setError(`Error del servidor: ${res.status}`);
        } catch (err: any) {
            setError("No se pudo conectar con el servidor.");
        } finally { setCargando(false); }
    };

    useEffect(() => { cargarGrupos(); }, []);

    const eliminarAlumno = async (idAlumno: number, nombreAlumno: string) => {
        if (!window.confirm(`¿Seguro que deseas desvincular a ${nombreAlumno}?`)) return;
        try {
            const res = await fetch(`http://localhost:3000/api/alumnos-admi/alumnos/${idAlumno}`, { method: 'DELETE' });
            if (res.ok) await cargarGrupos(false);
            else alert("Error al desvincular");
        } catch (err) { alert("Error de conexión."); }
    };

    const cambiarEstado = async (nuevoEstado: number) => {
        if (!modalActividad.idTarget || !modalActividad.tipo) return;

        try {
            const url = modalActividad.tipo === 'grupo'
                ? `http://localhost:3000/api/alumnos-admi/grupos/${modalActividad.idTarget}/estado`
                : `http://localhost:3000/api/alumnos-admi/alumnos/${modalActividad.idTarget}/estado`;

            const res = await fetch(url, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ estado: nuevoEstado })
            });

            if (res.ok) {
                await cargarGrupos(false);
                setModalActividad({ visible: false, tipo: null, idTarget: null, nombreTarget: '', estadoActual: false });
            } else {
                alert("Error al cambiar el estado en la base de datos.");
            }
        } catch (error) { console.error(error); }
    };

    let gruposProcesados = [...grupos];

    if (busqueda) {
        gruposProcesados = gruposProcesados.filter(g =>
            `GRUPO ${g.nombreGrupo}`.toLowerCase().includes(busqueda.toLowerCase()) ||
            `${g.semestre} SEMESTRE`.toLowerCase().includes(busqueda.toLowerCase())
        );
    }
    if (soloConAlumnos) gruposProcesados = gruposProcesados.filter(g => g.alumnos.length > 0);
    if (soloActivos) gruposProcesados = gruposProcesados.filter(g => g.activo === true);

    gruposProcesados.sort((a, b) => {
        if (orden === 'AZ') {
            if (a.semestre === b.semestre) return a.nombreGrupo.localeCompare(b.nombreGrupo);
            return parseInt(a.semestre) - parseInt(b.semestre);
        }
        if (orden === 'ZA') {
            if (a.semestre === b.semestre) return b.nombreGrupo.localeCompare(a.nombreGrupo);
            return parseInt(b.semestre) - parseInt(a.semestre);
        }
        if (orden === 'MAYOR_ALUMNOS') return b.alumnos.length - a.alumnos.length;
        if (orden === 'MENOR_ALUMNOS') return a.alumnos.length - b.alumnos.length;
        return 0;
    });

    const toggleExpand = (id: number) => setExpandedGroup(expandedGroup === id ? null : id);

    return (
        <div className="main-wrapper">
            <Header titulo="ADMINISTRACION DE ALUMNOS" onBack={onBack} />
            <main className="dashboard-grid single-column">

                <section className="card search-bar-card" style={{ gap: '15px' }}>
                    <div className="search-wrapper full-width">
                        <input type="text" placeholder="Buscar grupo..." className="input-field search-input" value={busqueda} onChange={(e) => setBusqueda(e.target.value.replace(/[0-9]/g, ''))} />
                        <button className="search-btn"><span className="material-icons">search</span></button>
                    </div>

                    <div className="filter-wrapper">
                        <button className="btn-filter" onClick={() => setMostrarFiltros(!mostrarFiltros)}><span className="material-icons">filter_list</span></button>
                        {mostrarFiltros && (
                            <div className="filter-dropdown animate-fade-in">
                                <div className="filter-section">
                                    <h4>Mostrar Específicos</h4>
                                    <label className="filter-checkbox"><input type="checkbox" checked={soloConAlumnos} onChange={(e) => setSoloConAlumnos(e.target.checked)} /><span>Solo grupos con alumnos</span></label>
                                    <label className="filter-checkbox"><input type="checkbox" checked={soloActivos} onChange={(e) => setSoloActivos(e.target.checked)} /><span>Solo grupos activos</span></label>
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

                {cargando && <div style={{ textAlign: 'center', padding: '40px' }}><h2>Cargando grupos...</h2></div>}
                {error && <div style={{ textAlign: 'center', padding: '40px', color: 'red' }}><h2>{error}</h2></div>}

                {!cargando && !error && (
                    <div className="groups-list">
                        {/* AQUÍ ESTABA EL ERROR: Faltaba esta línea para manejar cuando la lista está vacía */}
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
                                            <h3>GRUPO {grupo.nombreGrupo} - {grupo.semestre}° SEMESTRE <span className="count-badge">{grupo.alumnos.length} {grupo.alumnos.length === 1 ? 'Alumno' : 'Alumnos'}</span></h3>
                                        </div>
                                        <div className="group-actions" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                            <button
                                                className={`status-badge ${grupo.activo ? 'active' : 'inactive'}`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setModalActividad({ visible: true, tipo: 'grupo', idTarget: grupo.id, nombreTarget: `Grupo ${grupo.nombreGrupo}`, estadoActual: grupo.activo });
                                                }}
                                            >
                                                {grupo.activo ? 'ACTIVO' : 'INACTIVO'}
                                            </button>
                                            <button className="btn-icon-secondary" style={{ backgroundColor: 'var(--orange)', color: 'white', border: 'none' }}><span className="material-icons">{expandedGroup === grupo.id ? 'expand_less' : 'expand_more'}</span></button>
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
                                                                    <td className="fw-bold">{alumno.nombre}<br /><small style={{ color: '#aaa', fontWeight: 'normal' }}>{alumno.carrera !== 'N/A' ? alumno.carrera : 'Sin Carrera Asignada'} - {alumno.salon}</small></td>
                                                                    <td className="matricula-text">{alumno.matricula}</td>
                                                                    <td className="text-center">
                                                                        <button
                                                                            className={`status-badge ${alumno.activo ? 'active' : 'inactive'}`}
                                                                            style={{ padding: '4px 12px', fontSize: '0.8rem' }}
                                                                            onClick={() => setModalActividad({ visible: true, tipo: 'alumno', idTarget: alumno.id, nombreTarget: alumno.nombre, estadoActual: alumno.activo })}
                                                                        >
                                                                            {alumno.activo ? 'ACTIVO' : 'INACTIVO'}
                                                                        </button>
                                                                    </td>
                                                                    <td>
                                                                        <div className="row-actions justify-center">
                                                                            <button className="btn-mini edit" title="Editar" onClick={() => onEditAlumno(alumno.matricula)}><span className="material-icons">edit</span></button>
                                                                            <button className="btn-mini delete" title="Desvincular Alumno" onClick={() => eliminarAlumno(alumno.id, alumno.nombre)}><span className="material-icons">delete</span></button>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            ) : (
                                                <div className="empty-state-group"><span className="material-icons">group_off</span><p>No hay alumnos en este grupo</p></div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                )}
            </main>

            {/* --- MODAL DE CAMBIO DE ESTADO --- */}
            {modalActividad.visible && (
                <div className="modal-overlay">
                    <div className="modal-box">
                        <div className="modal-header">
                            <h3>Cambiar Estado</h3>
                            <button className="btn-close-modal" onClick={() => setModalActividad({ visible: false, tipo: null, idTarget: null, nombreTarget: '', estadoActual: false })}>
                                <span className="material-icons">close</span>
                            </button>
                        </div>
                        <div className="modal-body" style={{ textAlign: 'center' }}>
                            <p style={{ marginBottom: '20px', fontSize: '1.1rem' }}>
                                ¿Cambiar el estado de <strong>{modalActividad.nombreTarget}</strong>?
                            </p>

                            {modalActividad.tipo === 'grupo' && modalActividad.estadoActual === true && (
                                <div style={{ backgroundColor: '#fff3cd', color: '#856404', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.9rem', textAlign: 'left', display: 'flex', gap: '10px', alignItems: 'center' }}>
                                    <span className="material-icons">warning</span>
                                    <span>Al desactivar el grupo, <b>todos sus alumnos</b> también pasarán a INACTIVOS de forma automática.</span>
                                </div>
                            )}

                            <div className="modal-buttons-row">
                                <button className="btn-modal-active" onClick={() => cambiarEstado(1)}>MARCAR ACTIVO</button>
                                <button className="btn-modal-inactive" onClick={() => cambiarEstado(0)}>MARCAR INACTIVO</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};