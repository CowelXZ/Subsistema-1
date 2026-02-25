import React, { useState, useEffect } from 'react';
import './AsignacionCargo.css';
import { Header } from './common/Header';

interface Clase {
    id: number;
    materia: string;
    horaInicio: string;
    horaFin: string;
    dias: string[];
}

interface Profesor {
    id: number;
    nombre: string;
    foto: string;
    clases: Clase[];
}

interface Props {
    onBack: () => void;
}

export const AsignacionCarga: React.FC<Props> = ({ onBack }) => {
    // --- ESTADOS ---
    const [profesores, setProfesores] = useState<Profesor[]>([]);
    const [busqueda, setBusqueda] = useState("");
    const [expandedProf, setExpandedProf] = useState<number | null>(null);

    const [addingForProf, setAddingForProf] = useState<number | null>(null);
    const [listaCarreras, setListaCarreras] = useState<any[]>([]);
    const [listaMaterias, setListaMaterias] = useState<any[]>([]);
    
    const estadoInicialMateria = {
        materia: '', horaInicio: '', horaFin: '', dias: [] as string[],
        semestre: '1', grupo: 'A', carrera: '', salon: 'AULA 1', idarea: '1'
    };
    const [nuevaMateria, setNuevaMateria] = useState(estadoInicialMateria);

    // --- CARGAR DATOS REALES DE LA BASE DE DATOS ---
    const cargarCargaAcademica = async () => {
        try {
            const res = await fetch('http://localhost:3000/api/maestros/carga');
            if (res.ok) {
                const data = await res.json();
                setProfesores(data);
            }
        } catch (error) {
            console.error("Error al cargar profesores:", error);
        }
    };

    useEffect(() => {
        cargarCargaAcademica(); // Llama a la BD al abrir la pantalla

        fetch('http://localhost:3000/api/carreras')
            .then(res => res.json())
            .then(data => setListaCarreras(data))
            .catch(err => console.error("Error carreras:", err));

        fetch('http://localhost:3000/api/materias')
            .then(res => res.json())
            .then(data => setListaMaterias(data))
            .catch(err => console.error("Error materias:", err));
    }, []);

    // Filtrado y Acordeón
    const profesoresFiltrados = profesores.filter(p =>
        p.nombre.toLowerCase().includes(busqueda.toLowerCase())
    );

    const toggleExpand = (id: number) => {
        setExpandedProf(expandedProf === id ? null : id);
        setAddingForProf(null);
    };

    const handleMateriaChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setNuevaMateria(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const toggleDia = (dia: string) => {
        setNuevaMateria(prev => ({
            ...prev,
            dias: prev.dias.includes(dia) ? prev.dias.filter(d => d !== dia) : [...prev.dias, dia]
        }));
    };

    // --- GUARDAR EN BD ---
    const guardarNuevaMateria = async (profId: number) => {
        if (!nuevaMateria.materia || !nuevaMateria.horaInicio || !nuevaMateria.horaFin || nuevaMateria.dias.length === 0) {
            alert("Por favor completa todos los campos del horario (Materia, Horas y Días).");
            return;
        }

        try {
            const payload = { ...nuevaMateria, idMaestro: profId };
            
            const res = await fetch('http://localhost:3000/api/maestros/agregar-materia', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                // Si SQL guardó correctamente, recargamos la lista para ver la nueva materia
                await cargarCargaAcademica(); 
                setNuevaMateria(estadoInicialMateria);
                setAddingForProf(null);
                alert("Materia asignada correctamente");
            } else {
                alert("Error al guardar en la base de datos.");
            }
        } catch (error) {
            console.error("Error:", error);
        }
    };

    // --- ELIMINAR EN BD ---
    const eliminarMateria = async (idClase: number) => {
        if(!window.confirm("¿Seguro que deseas eliminar esta materia?")) return;

        try {
            const res = await fetch(`http://localhost:3000/api/maestros/eliminar-materia/${idClase}`, {
                method: 'DELETE'
            });

            if(res.ok) {
                await cargarCargaAcademica(); // Recargar la lista
            }
        } catch (error) {
            console.error("Error al eliminar:", error);
        }
    };

    return (
        <div className="main-wrapper">
            <Header titulo="ASIGNACIÓN DE CARGA ACADÉMICA" onBack={onBack} />

            <main className="dashboard-grid single-column">
                {/* --- BARRA DE BÚSQUEDA --- */}
                <section className="card search-bar-card">
                    <div className="search-wrapper full-width">
                        <input
                            type="text"
                            placeholder="Buscar profesor por nombre..."
                            className="input-field search-input"
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                        />
                        <button className="search-btn">
                            <span className="material-icons">search</span>
                        </button>
                    </div>
                </section>

                {/* --- LISTA DE PROFESORES --- */}
                <div className="professors-list">
                    {profesoresFiltrados.map(prof => (
                        <div key={prof.id} className="card professor-card">

                            {/* CABECERA */}
                            <div className="prof-header" onClick={() => toggleExpand(prof.id)}>
                                <div className="prof-info">
                                    <img src={prof.foto} alt={prof.nombre} className="prof-avatar" />
                                    <div>
                                        <h3>{prof.nombre}</h3>
                                        <small>{prof.clases.length} Materias Asignadas</small>
                                    </div>
                                </div>
                                <div className="prof-actions">
                                    <button className="btn-icon-secondary">
                                        <span className="material-icons">
                                            {expandedProf === prof.id ? 'expand_less' : 'expand_more'}
                                        </span>
                                    </button>
                                </div>
                            </div>

                            {/* CONTENIDO EXPANDIDO */}
                            {expandedProf === prof.id && (
                                <div className="prof-body animate-fade-in">
                                    
                                    {/* TABLA DE MATERIAS */}
                                    {prof.clases.length > 0 && (
                                        <table className="schedule-table">
                                            <thead>
                                                <tr>
                                                    <th>Materia</th>
                                                    <th>Horario</th>
                                                    <th>Días</th>
                                                    <th>Acciones</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {prof.clases.map(clase => (
                                                    <tr key={clase.id}>
                                                        <td className="fw-bold">{clase.materia}</td>
                                                        <td>{clase.horaInicio} - {clase.horaFin}</td>
                                                        <td>
                                                            <div className="days-badge">
                                                                {['L', 'M', 'MM', 'J', 'V'].map(d => (
                                                                    <span key={d} className={clase.dias.includes(d) ? 'active' : ''}>
                                                                        {d === 'MM' ? 'X' : d} 
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <div className="row-actions">
                                                                <button className="btn-mini edit" title="Editar"><span className="material-icons">edit</span></button>
                                                                <button className="btn-mini delete" title="Eliminar" onClick={() => eliminarMateria(clase.id)}>
                                                                    <span className="material-icons">delete</span>
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}

                                    {/* FORMULARIO */}
                                    {addingForProf === prof.id ? (
                                        <div className="hours-section animate-fade-in" style={{ marginTop: '20px', padding: '20px', border: '1px solid #eee' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                                <h3 style={{ color: 'var(--uat-guinda)', margin: 0 }}>Agregar Nueva Materia</h3>
                                                <button className="btn-mini" onClick={() => setAddingForProf(null)}>
                                                    <span className="material-icons">close</span>
                                                </button>
                                            </div>

                                            <div className="user-form">
                                                <div className="form-group">
                                                    <label>Materia</label>
                                                    <select name="materia" className="input-field" value={nuevaMateria.materia} onChange={handleMateriaChange}>
                                                        <option value="">Seleccione una materia...</option>
                                                        {listaMaterias.map((m, index) => (
                                                            <option key={index} value={m.Materia}>{m.Materia}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                
                                                <div className="form-row" style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                                                    <div className="form-group" style={{ flex: 1 }}>
                                                        <label>Carrera</label>
                                                        <select name="carrera" className="input-field" value={nuevaMateria.carrera} onChange={handleMateriaChange}>
                                                            <option value="">Seleccione...</option>
                                                            {listaCarreras.map(c => (
                                                                <option key={c.idCarrera} value={c.NombreCarrera}>{c.NombreCarrera}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div className="form-group" style={{ flex: 1 }}>
                                                        <label>Salón / Área</label>
                                                        <select name="salon" className="input-field" value={nuevaMateria.salon} onChange={handleMateriaChange}>
                                                            <option value="AULA 1">AULA 1</option>
                                                            <option value="AULA 2">AULA 2</option>
                                                            <option value="AULA 3">AULA 3</option>
                                                            <option value="CENTRO DE CÓMPUTO">CENTRO DE CÓMPUTO</option>
                                                        </select>
                                                    </div>
                                                </div>

                                                <div className="form-row" style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                                                    <div className="form-group" style={{ flex: 1 }}>
                                                        <label>Semestre</label>
                                                        <select name="semestre" className="input-field" value={nuevaMateria.semestre} onChange={handleMateriaChange}>
                                                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(s => (
                                                                <option key={s} value={s}>{s}° Semestre</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div className="form-group" style={{ flex: 1 }}>
                                                        <label>Grupo</label>
                                                        <select name="grupo" className="input-field" value={nuevaMateria.grupo} onChange={handleMateriaChange}>
                                                            {['A', 'B', 'C', 'D', 'E', 'F', 'G'].map(g => (
                                                                <option key={g} value={g}>Grupo {g}</option>
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
                                                                key={dia} 
                                                                type="button" 
                                                                className={`btn-day ${nuevaMateria.dias.includes(dia) ? 'active' : ''}`} 
                                                                onClick={() => toggleDia(dia)}
                                                            >
                                                                {dia === 'MM' ? 'Mi' : dia}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                                <button type="button" onClick={() => guardarNuevaMateria(prof.id)} className="btn-add-hour">
                                                    <span className="material-icons">add_circle</span> AGREGAR MATERIA
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="add-subject-row" style={{ marginTop: '15px' }}>
                                            <button className="btn-outline-primary" onClick={() => setAddingForProf(prof.id)}>
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
        </div>
    );
};