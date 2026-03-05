import React, { useState, useEffect } from 'react';
import './AsignacionCargo.css';
import { Header } from './common/Header';

interface Clase {
    id: number;
    materia: string;
    horaInicio: string;
    horaFin: string;
    dias: string[];
    carrera: string;
    salon: string;
    semestre: string | number;
    grupo: string;
}

interface Profesor {
    id: number;
    nombre: string;
    foto: string;
    activo: boolean; 
    clases: Clase[];
}

interface Props { onBack: () => void; }

export const AsignacionCarga: React.FC<Props> = ({ onBack }) => {
    const [profesores, setProfesores] = useState<Profesor[]>([]);
    const [busqueda, setBusqueda] = useState("");
    const [expandedProf, setExpandedProf] = useState<number | null>(null);

    const [addingForProf, setAddingForProf] = useState<number | null>(null);
    const [editingClassId, setEditingClassId] = useState<number | null>(null);
    
    const [mostrarFiltros, setMostrarFiltros] = useState(false);
    const [filtroEstado, setFiltroEstado] = useState<'TODOS'|'ACTIVOS'|'INACTIVOS'>('TODOS');
    const [orden, setOrden] = useState<'AZ'|'ZA'|'RECIENTES'>('AZ');

    const [modalActividad, setModalActividad] = useState<{ visible: boolean, profId: number | null, paso: 1 | 2 }>({ visible: false, profId: null, paso: 1 });

    // --- ESTADOS DINÁMICOS COMPLETOS ---
    const [listaCarreras, setListaCarreras] = useState<any[]>([]);
    const [listaMaterias, setListaMaterias] = useState<any[]>([]);
    const [listaSemestres, setListaSemestres] = useState<any[]>([]);
    const [listaLetrasGrupo, setListaLetrasGrupo] = useState<any[]>([]);
    const [listaAreas, setListaAreas] = useState<any[]>([]); // NUEVO: Estado para salones
    
    const estadoInicialMateria = {
        materia: '', horaInicio: '', horaFin: '', dias: [] as string[],
        semestre: '1', grupo: 'A', carrera: '', salon: 'AULA 1', idarea: '1'
    };
    const [nuevaMateria, setNuevaMateria] = useState(estadoInicialMateria);

    const cargarCargaAcademica = async () => {
        try {
            const res = await fetch('http://localhost:3000/api/maestros/carga');
            if (res.ok) setProfesores(await res.json());
        } catch (error) { console.error("Error:", error); }
    };

    // --- CARGA DE TODOS LOS CATÁLOGOS ---
    useEffect(() => {
        cargarCargaAcademica();
        fetch('http://localhost:3000/api/carreras').then(res => res.json()).then(data => setListaCarreras(data));
        fetch('http://localhost:3000/api/materias').then(res => res.json()).then(data => setListaMaterias(data));
        fetch('http://localhost:3000/api/semestres').then(res => res.json()).then(data => setListaSemestres(data));
        fetch('http://localhost:3000/api/grupos-letras').then(res => res.json()).then(data => setListaLetrasGrupo(data));
        fetch('http://localhost:3000/api/areas').then(res => res.json()).then(data => setListaAreas(data)); // NUEVO
    }, []);

    let profesoresProcesados = [...profesores];
    
    if (busqueda) profesoresProcesados = profesoresProcesados.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase()));
    if (filtroEstado === 'ACTIVOS') profesoresProcesados = profesoresProcesados.filter(p => p.activo);
    if (filtroEstado === 'INACTIVOS') profesoresProcesados = profesoresProcesados.filter(p => !p.activo);
    
    profesoresProcesados.sort((a, b) => {
        if (orden === 'AZ') return a.nombre.localeCompare(b.nombre);
        if (orden === 'ZA') return b.nombre.localeCompare(a.nombre);
        if (orden === 'RECIENTES') return b.id - a.id; 
        return 0;
    });

    const toggleExpand = (id: number) => { setExpandedProf(expandedProf === id ? null : id); cerrarFormulario(); };
    const cerrarFormulario = () => { setAddingForProf(null); setEditingClassId(null); setNuevaMateria(estadoInicialMateria); };
    
    // --- LÓGICA DE ACTUALIZACIÓN DUAL (ID ÁREA + NOMBRE DEL SALÓN) ---
    const handleMateriaChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => { 
        const { name, value } = e.target;
        if (name === 'idarea') {
            const areaSeleccionada = listaAreas.find(a => a.idArea.toString() === value);
            setNuevaMateria(prev => ({ 
                ...prev, 
                idarea: value, 
                salon: areaSeleccionada ? areaSeleccionada.Observaciones : '' 
            }));
        } else {
            setNuevaMateria(prev => ({ ...prev, [name]: value })); 
        }
    };

    const toggleDia = (dia: string) => { setNuevaMateria(prev => ({ ...prev, dias: prev.dias.includes(dia) ? prev.dias.filter(d => d !== dia) : [...prev.dias, dia] })); };

    const iniciarEdicion = (profId: number, clase: Clase) => {
        setAddingForProf(profId); setEditingClassId(clase.id);
        
        // Mapeo inverso: Buscar el ID del área basándonos en el nombre del salón guardado
        const areaMatch = listaAreas.find(a => a.Observaciones === clase.salon);
        const areaId = areaMatch ? areaMatch.idArea.toString() : '1';

        setNuevaMateria({
            materia: clase.materia, horaInicio: clase.horaInicio, horaFin: clase.horaFin, dias: clase.dias,
            carrera: clase.carrera === 'N/A' ? '' : clase.carrera, 
            salon: clase.salon === 'N/A' ? 'AULA 1' : clase.salon,
            semestre: String(clase.semestre), grupo: clase.grupo === '-' ? 'A' : clase.grupo, 
            idarea: areaId // Pasamos el ID calculado
        });
    };

const guardarNuevaMateria = async (profId: number) => {
        let errores: string[] = [];

        // 1. Validaciones individuales heredadas de RegistroMaestros
        if (!nuevaMateria.materia) errores.push("• Materia: Escribe o selecciona una materia.");
        if (!nuevaMateria.carrera) errores.push("• Carrera: Selecciona la carrera.");
        if (!nuevaMateria.semestre) errores.push("• Semestre: Selecciona el semestre.");
        if (!nuevaMateria.grupo) errores.push("• Grupo: Selecciona la letra del grupo.");
        if (!nuevaMateria.horaInicio) errores.push("• Hora Inicio: Define a qué hora empieza la clase.");
        if (!nuevaMateria.horaFin) errores.push("• Hora Final: Define a qué hora termina la clase.");
        if (nuevaMateria.dias.length === 0) errores.push("• Días de Clase: Selecciona al menos un día (L, M, Mi, J, V).");

        // 2. Validación de la lógica del tiempo
        if (nuevaMateria.horaInicio && nuevaMateria.horaFin) {
            if (nuevaMateria.horaInicio >= nuevaMateria.horaFin) {
                errores.push("• Horario inválido: La hora de inicio debe ser antes de la hora final.");
            }
        }

        // 3. Mostrar errores si los hay
        if (errores.length > 0) {
            alert("⚠️ No se puede guardar la materia. Por favor revisa lo siguiente:\n\n" + errores.join("\n"));
            return;
        }

        // --- Si todo está correcto, hacemos el guardado/edición ---
        try {
            const url = editingClassId ? `http://localhost:3000/api/maestros/editar-materia/${editingClassId}` : 'http://localhost:3000/api/maestros/agregar-materia';
            const res = await fetch(url, { 
                method: editingClassId ? 'PUT' : 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ ...nuevaMateria, idMaestro: profId }) 
            });
            
            if (res.ok) { 
                await cargarCargaAcademica(); 
                cerrarFormulario(); 
            } else {
                alert("❌ Error al comunicarse con el servidor.");
            }
        } catch (error) { 
            console.error("Error:", error); 
        }
    };

    const eliminarMateria = async (idClase: number) => {
        if(!window.confirm("¿Seguro que deseas eliminar esta materia?")) return;
        try {
            const res = await fetch(`http://localhost:3000/api/maestros/eliminar-materia/${idClase}`, { method: 'DELETE' });
            if(res.ok) await cargarCargaAcademica();
        } catch (error) { console.error("Error:", error); }
    };

    const cambiarEstado = async (nuevoEstado: number) => {
        if (!modalActividad.profId) return;
        try {
            const res = await fetch(`http://localhost:3000/api/maestros/estado/${modalActividad.profId}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estado: nuevoEstado })
            });
            if (res.ok) { await cargarCargaAcademica(); setModalActividad(prev => ({ ...prev, paso: 2 })); }
        } catch (error) { console.error("Error cambiando estado", error); }
    };

    return (
        <div className="main-wrapper">
            <Header titulo="Administracion de Maestros" onBack={onBack} />

            <main className="dashboard-grid single-column">
                
                <section className="card search-bar-card" style={{ gap: '15px' }}>
                    <div className="search-wrapper full-width">
                        <input type="text" placeholder="Buscar profesor por nombre..." className="input-field search-input" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
                        <button className="search-btn"><span className="material-icons">search</span></button>
                    </div>

                    <div className="filter-wrapper">
                        <button className="btn-filter" onClick={() => setMostrarFiltros(!mostrarFiltros)}>
                            <span className="material-icons">filter_list</span>
                        </button>
                        
                        {mostrarFiltros && (
                            <div className="filter-dropdown animate-fade-in">
                                <div className="filter-section">
                                    <h4>Mostrar</h4>
                                    <button className={`filter-option ${filtroEstado === 'TODOS' ? 'selected' : ''}`} onClick={() => {setFiltroEstado('TODOS'); setMostrarFiltros(false)}}>Todos</button>
                                    <button className={`filter-option ${filtroEstado === 'ACTIVOS' ? 'selected' : ''}`} onClick={() => {setFiltroEstado('ACTIVOS'); setMostrarFiltros(false)}}>Solo Activos</button>
                                    <button className={`filter-option ${filtroEstado === 'INACTIVOS' ? 'selected' : ''}`} onClick={() => {setFiltroEstado('INACTIVOS'); setMostrarFiltros(false)}}>Solo Inactivos</button>
                                </div>
                                <div className="filter-section" style={{ borderBottom: 'none' }}>
                                    <h4>Ordenar por</h4>
                                    <button className={`filter-option ${orden === 'AZ' ? 'selected' : ''}`} onClick={() => {setOrden('AZ'); setMostrarFiltros(false)}}>Alfabético (A-Z)</button>
                                    <button className={`filter-option ${orden === 'ZA' ? 'selected' : ''}`} onClick={() => {setOrden('ZA'); setMostrarFiltros(false)}}>Inverso (Z-A)</button>
                                    <button className={`filter-option ${orden === 'RECIENTES' ? 'selected' : ''}`} onClick={() => {setOrden('RECIENTES'); setMostrarFiltros(false)}}>Más Recientes</button>
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                <div className="professors-list">
                    {profesoresProcesados.map(prof => (
                        <div key={prof.id} className="card professor-card">
                            <div className="prof-header" onClick={() => toggleExpand(prof.id)}>
                                <div className="prof-info">
                                    <img src={prof.foto} alt={prof.nombre} className="prof-avatar" />
                                    <div>
                                        <h3>{prof.nombre}</h3>
                                        <small>{prof.clases.length} Materias Asignadas</small>
                                    </div>
                                </div>
                                <div className="prof-actions" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    <button 
                                        className={`status-badge ${prof.activo ? 'active' : 'inactive'}`}
                                        onClick={(e) => { e.stopPropagation(); setModalActividad({ visible: true, profId: prof.id, paso: 1 }); }}
                                    >
                                        {prof.activo ? 'ACTIVO' : 'INACTIVO'}
                                    </button>
                                    <button className="btn-icon-secondary" style={{ backgroundColor: 'var(--orange)', color: 'white', border: 'none' }}>
                                        <span className="material-icons">{expandedProf === prof.id ? 'expand_less' : 'expand_more'}</span>
                                    </button>
                                </div>
                            </div>

                            {expandedProf === prof.id && (
                                <div className="prof-body animate-fade-in">
                                    {prof.clases.length > 0 && (
                                        <table className="schedule-table">
                                            <thead>
                                                <tr><th>Materia</th><th>Horario</th><th>Días</th><th>Acciones</th></tr>
                                            </thead>
                                            <tbody>
                                                {prof.clases.map(clase => (
                                                    <tr key={clase.id} className={editingClassId === clase.id ? 'editing-row' : ''}>
                                                        <td className="fw-bold">
                                                            {clase.materia}<br/>
                                                            <small style={{ color: '#888', fontWeight: 'normal', fontSize: '0.85rem', display: 'block', marginTop: '3px' }}>
                                                                {clase.carrera} - {clase.salon} <span style={{color: '#ddd', margin: '0 5px'}}>|</span> {clase.semestre}° Semestre, Grupo {clase.grupo}
                                                            </small>
                                                        </td>
                                                        <td>{clase.horaInicio} - {clase.horaFin}</td>
                                                        <td>
                                                            <div className="days-badge">
                                                                {['L', 'M', 'MM', 'J', 'V'].map(d => (
                                                                    <span key={d} className={clase.dias.includes(d) ? 'active' : ''}>{d === 'MM' ? 'X' : d}</span>
                                                                ))}
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <div className="row-actions">
                                                                <button className="btn-mini edit" title="Editar" onClick={() => iniciarEdicion(prof.id, clase)}><span className="material-icons">edit</span></button>
                                                                <button className="btn-mini delete" title="Eliminar" onClick={() => eliminarMateria(clase.id)}><span className="material-icons">delete</span></button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}

                                    {addingForProf === prof.id ? (
                                        <div className="hours-section animate-fade-in" style={{ marginTop: '20px', padding: '20px', border: '1px solid #eee' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                                <h3 style={{ color: 'var(--uat-guinda)', margin: 0 }}>
                                                    {editingClassId ? 'Editar Materia' : 'Agregar Nueva Materia'}
                                                </h3>
                                                <button className="btn-mini" onClick={cerrarFormulario}><span className="material-icons">close</span></button>
                                            </div>

                                            <div className="user-form">
                                                <div className="form-group">
                                                    <label>Materia</label>
                                                    <input 
                                                        type="text"
                                                        list={`opciones-materias-${prof.id}`}
                                                        name="materia" 
                                                        className="input-field" 
                                                        value={nuevaMateria.materia} 
                                                        onChange={handleMateriaChange}
                                                        placeholder="Seleccione o escriba una materia nueva..."
                                                        autoComplete="off"
                                                    />
                                                    <datalist id={`opciones-materias-${prof.id}`}>
                                                        {listaMaterias.map((m, index) => (
                                                            <option key={index} value={m.Materia} />
                                                        ))}
                                                    </datalist>
                                                </div>
                                                
                                                <div className="form-row" style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                                                    <div className="form-group" style={{ flex: 1 }}>
                                                        <label>Carrera</label>
                                                        <select name="carrera" className="input-field" value={nuevaMateria.carrera} onChange={handleMateriaChange}>
                                                            <option value="">Seleccione...</option>
                                                            {listaCarreras.map((c, index) => (
                                                                <option key={index} value={c.Carrera}>{c.Carrera}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div className="form-group" style={{ flex: 1 }}>
                                                        <label>Salón / Área</label>
                                                        <select name="idarea" className="input-field" value={nuevaMateria.idarea} onChange={handleMateriaChange}>
                                                            <option value="">Seleccione...</option>
                                                            {/* NUEVA CARGA DE SALONES DINÁMICOS */}
                                                            {listaAreas.map(a => (
                                                                <option key={a.idArea} value={a.idArea}>{a.Observaciones}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>

                                                <div className="form-row" style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                                                    <div className="form-group" style={{ flex: 1 }}>
                                                        <label>Semestre</label>
                                                        <select name="semestre" className="input-field" value={nuevaMateria.semestre} onChange={handleMateriaChange}>
                                                            <option value="">Seleccione...</option>
                                                            {listaSemestres.map((s, index) => (
                                                                <option key={index} value={s.Semestre}>{s.Semestre}° Semestre</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div className="form-group" style={{ flex: 1 }}>
                                                        <label>Grupo</label>
                                                        <select name="grupo" className="input-field" value={nuevaMateria.grupo} onChange={handleMateriaChange}>
                                                            <option value="">Seleccione...</option>
                                                            {listaLetrasGrupo.map((g, index) => (
                                                                <option key={index} value={g.Grupo}>Grupo {g.Grupo}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>

                                                <div className="form-row" style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                                                    <div className="form-group" style={{ flex: 1 }}>
                                                        <label>Hora Inicio</label>
                                                        <input name="horaInicio" type="time" className="input-field" value={nuevaMateria.horaInicio} onChange={handleMateriaChange} />
                                                    </div>
                                                    <div className="form-group" style={{ flex: 1 }}>
                                                        <label>Hora Fin</label>
                                                        <input name="horaFin" type="time" className="input-field" value={nuevaMateria.horaFin} onChange={handleMateriaChange} />
                                                    </div>
                                                </div>

                                                <div className="form-group">
                                                    <label className="label-centered">Días de Clase</label>
                                                    <div className="days-selector">
                                                        {['L', 'M', 'MM', 'J', 'V'].map(dia => (
                                                            <button 
                                                                key={dia} type="button" 
                                                                className={`btn-day ${nuevaMateria.dias.includes(dia) ? 'active' : ''}`} 
                                                                onClick={() => toggleDia(dia)}
                                                            >
                                                                {dia === 'MM' ? 'Mi' : dia}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                                
                                                <button type="button" onClick={() => guardarNuevaMateria(prof.id)} className="btn-add-hour">
                                                    <span className="material-icons">{editingClassId ? 'save' : 'add_circle'}</span> 
                                                    {editingClassId ? 'GUARDAR CAMBIOS' : 'AGREGAR MATERIA'}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="add-subject-row" style={{ marginTop: '15px' }}>
                                            <button className="btn-outline-primary" onClick={() => {cerrarFormulario(); setAddingForProf(prof.id)}}>
                                                <span className="material-icons">add_circle</span> Asignar Nueva Materia
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </main>

            {/* MODAL DE ACTIVIDAD */}
            {modalActividad.visible && (
                <div className="modal-overlay">
                    <div className="modal-box">
                        <div className="modal-header">
                            <h3>Cambiar Actividad</h3>
                            <button className="btn-close-modal" onClick={() => setModalActividad({ visible: false, profId: null, paso: 1 })}>
                                <span className="material-icons">close</span>
                            </button>
                        </div>
                        <div className="modal-body">
                            {modalActividad.paso === 1 ? (
                                <div className="modal-buttons-row">
                                    <button className="btn-modal-active" onClick={() => cambiarEstado(1)}>ACTIVO</button>
                                    <button className="btn-modal-inactive" onClick={() => cambiarEstado(0)}>INACTIVO</button>
                                </div>
                            ) : (
                                <div className="modal-success-content animate-fade-in">
                                    <div className="success-icon"><span className="material-icons">check</span></div>
                                    <p>Cambios realizados de forma correcta</p>
                                    <button className="btn-understood" onClick={() => setModalActividad({ visible: false, profId: null, paso: 1 })}>Entendido</button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};