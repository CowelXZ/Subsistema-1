import React, { useState } from 'react';
import { Header } from './common/Header';

// --- TIPOS DE DATOS ---
interface Clase {
    id: number;
    materia: string;
    horaInicio: string;
    horaFin: string;
    dias: string[]; // ['L', 'M', 'X', 'J', 'V']
}

interface Profesor {
    id: number;
    nombre: string;
    foto: string;
    clases: Clase[];
}

// --- DATOS MOCK (Simulados) ---
const MOCK_PROFESORES: Profesor[] = [
    {
        id: 1,
        nombre: "HUMBERTO CALLES DIAZ",
        foto: "https://i.pravatar.cc/150?img=11", // Foto aleatoria
        clases: [
            { id: 101, materia: "Orientación Institucional", horaInicio: "08:00", horaFin: "09:00", dias: ['L', 'M', 'V'] },
            { id: 102, materia: "Español 1", horaInicio: "12:00", horaFin: "13:00", dias: ['M', 'J'] },
        ]
    },
    {
        id: 2,
        nombre: "FERNANDO GIL COBARRUBIAS",
        foto: "https://i.pravatar.cc/150?img=13",
        clases: [
            { id: 201, materia: "Oratoria 1", horaInicio: "13:00", horaFin: "14:00", dias: ['L', 'X', 'V'] },
        ]
    }
];

export const AsignacionCarga = () => {
    const [profesores, setProfesores] = useState(MOCK_PROFESORES);
    const [busqueda, setBusqueda] = useState("");
    const [expandedProf, setExpandedProf] = useState<number | null>(null);

    // Filtrar profesores por nombre
    const profesoresFiltrados = profesores.filter(p => 
        p.nombre.toLowerCase().includes(busqueda.toLowerCase())
    );

    const toggleExpand = (id: number) => {
        setExpandedProf(expandedProf === id ? null : id);
    };

    return (
        <div className="main-wrapper">
            <Header titulo="ASIGNACIÓN DE CARGA ACADÉMICA" />

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
                            
                            {/* CABECERA DEL PROFESOR (Click para expandir) */}
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

                            {/* TABLA DE MATERIAS (Solo visible si está expandido) */}
                            {expandedProf === prof.id && (
                                <div className="prof-body animate-fade-in">
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
                                                        {/* Renderizado de Días tipo "Píldoras" */}
                                                        <div className="days-badge">
                                                            {['L','M','X','J','V'].map(d => (
                                                                <span key={d} className={clase.dias.includes(d) ? 'active' : ''}>
                                                                    {d}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="row-actions">
                                                            <button className="btn-mini edit" title="Editar"><span className="material-icons">edit</span></button>
                                                            <button className="btn-mini delete" title="Eliminar"><span className="material-icons">delete</span></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    
                                    <div className="add-subject-row">
                                        <button className="btn-outline-primary">
                                            <span className="material-icons">add_circle</span> Asignar Nueva Materia
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

            </main>
        </div>
    );
};