import React, { useState } from 'react';
import './RegistroMaestros.css';

// Tipos para el horario
type DiaSemana = 'L' | 'M' | 'X' | 'J' | 'V' | 'S';

interface Asignatura {
    id: number;
    materia: string;
    horaInicio: string;
    horaFin: string;
    dias: DiaSemana[];
}

export const RegistroMaestros = () => {
    // --- ESTADO: Datos del Maestro ---
    const [teacherData, setTeacherData] = useState({
        numeroEmpleado: '',
        nombres: '',
        apellidoPaterno: '',
        apellidoMaterno: '',
        gradoAcademico: 'Licenciatura',
        correo: '',
        sexo: 'M',
        observaciones: ''
    });

    // --- ESTADO: Lista de Horarios Agregados ---
    const [horario, setHorario] = useState<Asignatura[]>([]);

    // --- ESTADO: Formulario para Nueva Hora ---
    const [nuevaMateria, setNuevaMateria] = useState({
        materia: '',
        horaInicio: '',
        horaFin: '',
        dias: [] as DiaSemana[]
    });

    // Manejador genérico para datos del maestro
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setTeacherData(prev => ({ ...prev, [name]: value }));
    };

    // Manejador para el formulario de nueva materia
    const handleMateriaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setNuevaMateria(prev => ({ ...prev, [name]: value }));
    };

    // Toggle para selección de días
    const toggleDia = (dia: DiaSemana) => {
        setNuevaMateria(prev => {
            const existe = prev.dias.includes(dia);
            return {
                ...prev,
                dias: existe ? prev.dias.filter(d => d !== dia) : [...prev.dias, dia]
            };
        });
    };

    // Agregar nueva materia a la lista
    const agregarMateria = () => {
        if (!nuevaMateria.materia || !nuevaMateria.horaInicio || !nuevaMateria.horaFin || nuevaMateria.dias.length === 0) {
            alert("Por favor completa todos los campos del horario y selecciona al menos un día.");
            return;
        }

        const nuevaAsignatura: Asignatura = {
            id: Date.now(),
            ...nuevaMateria
        };

        setHorario([...horario, nuevaAsignatura]);
        
        // Resetear formulario de materia
        setNuevaMateria({ ...nuevaMateria, materia: '', horaInicio: '', horaFin: '', dias: [] });
    };

    // Eliminar materia de la lista
    const eliminarMateria = (id: number) => {
        setHorario(horario.filter(h => h.id !== id));
    };

    return (
        <div className="main-wrapper">
            <header className="top-bar">
                <img src="/img/logo-fcat.png" alt="FCAT" className="top-logo" />
                <h1>Registro de Maestros</h1>
                <img src="/img/logo-uat.jpeg" alt="UAT" className="top-logo" />
            </header>

            <main className="dashboard-grid maestros-grid">
                
                {/* --- COLUMNA IZQUIERDA: FORMULARIOS --- */}
                <div className="left-column-stack">
                    
                    {/* SECCIÓN 1: DATOS DEL MAESTRO */}
                    <section className="card">
                        <div className="card-header">
                            <div>
                                <h2>Datos del Maestro</h2>
                                <small>Información Personal y Laboral</small>
                            </div>
                        </div>

                        <form className="user-form">
                            <div className="form-group">
                                <label>Número de Empleado</label>
                                <div className="search-wrapper">
                                    <input
                                        name="numeroEmpleado"
                                        type="text"
                                        placeholder="Ej. 12345"
                                        className="input-field search-input"
                                        value={teacherData.numeroEmpleado}
                                        onChange={handleChange}
                                    />
                                    <button type="button" className="search-btn">
                                        <span className="material-icons">search</span>
                                    </button>
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Nombre(s)</label>
                                <input name="nombres" type="text" className="input-field" value={teacherData.nombres} onChange={handleChange} />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Apellido Paterno</label>
                                    <input name="apellidoPaterno" type="text" className="input-field" value={teacherData.apellidoPaterno} onChange={handleChange} />
                                </div>
                                <div className="form-group">
                                    <label>Apellido Materno</label>
                                    <input name="apellidoMaterno" type="text" className="input-field" value={teacherData.apellidoMaterno} onChange={handleChange} />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Grado Académico</label>
                                    <select name="gradoAcademico" className="input-field" value={teacherData.gradoAcademico} onChange={handleChange}>
                                        <option>Licenciatura</option>
                                        <option>Maestría</option>
                                        <option>Doctorado</option>
                                    </select>
                                </div>
                                {/* AQUÍ MOVIMOS EL CORREO PARA APROVECHAR EL ESPACIO */}
                                <div className="form-group">
                                    <label>Correo Institucional</label>
                                    <input name="correo" type="email" className="input-field" value={teacherData.correo} onChange={handleChange} />
                                </div>
                            </div>
                        </form>
                    </section>

                    {/* SECCIÓN 2: REGISTRO DE HORAS */}
                    <section className="card hours-section">
                        <div className="card-header">
                            <h2>Registro de Horas</h2>
                        </div>
                        <div className="user-form">
                            <div className="form-group">
                                <label>Materia</label>
                                <input 
                                    name="materia" 
                                    type="text" 
                                    placeholder="Nombre de la asignatura" 
                                    className="input-field" 
                                    value={nuevaMateria.materia} 
                                    onChange={handleMateriaChange} 
                                />
                            </div>
                            
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Hora Inicio</label>
                                    <input name="horaInicio" type="time" className="input-field" value={nuevaMateria.horaInicio} onChange={handleMateriaChange} />
                                </div>
                                <div className="form-group">
                                    <label>Hora Fin</label>
                                    <input name="horaFin" type="time" className="input-field" value={nuevaMateria.horaFin} onChange={handleMateriaChange} />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="label-centered">Días de Clase</label>
                                <div className="days-selector">
                                    {['L', 'M', 'X', 'J', 'V', 'S'].map((dia) => (
                                        <button
                                            key={dia}
                                            type="button"
                                            className={`btn-day ${nuevaMateria.dias.includes(dia as DiaSemana) ? 'active' : ''}`}
                                            onClick={() => toggleDia(dia as DiaSemana)}
                                        >
                                            {dia}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button type="button" onClick={agregarMateria} className="btn-add-hour">
                                <span className="material-icons">add_circle</span> AGREGAR HORA
                            </button>
                        </div>
                    </section>
                </div>

                {/* --- COLUMNA DERECHA: LISTA Y CÁMARA --- */}
                <div className="right-column-stack">
                    
                    {/* SECCIÓN 3: LISTA DE HORARIOS */}
                    <section className="card schedule-card">
                        <div className="card-header">
                            <h2>Horario Asignado</h2>
                        </div>
                        
                        <div className="schedule-list-container">
                            {horario.length === 0 ? (
                                <div className="empty-state">
                                    <span className="material-icons">event_busy</span>
                                    <p>No hay materias asignadas aún.</p>
                                </div>
                            ) : (
                                <table className="table-clean">
                                    <thead>
                                        <tr>
                                            <th>Materia</th>
                                            <th className="text-center">Horario</th>
                                            <th className="text-center">Días</th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {horario.map((item) => (
                                            <tr key={item.id}>
                                                <td className="fw-bold">{item.materia}</td>
                                                <td className="text-center text-sm">
                                                    {item.horaInicio} - {item.horaFin}
                                                </td>
                                                <td className="text-center">
                                                    <div className="days-badge-group">
                                                        {item.dias.map(d => (
                                                            <span key={d} className="badge-day">{d}</span>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="text-center">
                                                    <button onClick={() => eliminarMateria(item.id)} className="btn-icon-delete">
                                                        <span className="material-icons">delete</span>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </section>

                    {/* SECCIÓN 4: CÁMARA (COMPACTA) */}
                    <section className="card camera-card-compact">
                        <div className="card-header compact-header">
                            <h2>Fotografía</h2>
                            <button className="btn-outline btn-sm">
                                <span className="material-icons">photo_camera</span> Activar
                            </button>
                        </div>

                        <div className="camera-container compact-view">
                            <div className="camera-viewport viewport-sm">
                                <img src="/img/video-placeholder.png" alt="Vista Previa" className="video-feed" />
                            </div>
                        </div>

                        <div className="camera-actions compact-actions">
                            <div className="action-buttons-row">
                                <button className="btn-capture btn-sm">Capturar</button>
                                <button className="btn-clean btn-sm">Limpiar</button>
                            </div>
                        </div>
                    </section>

                </div>
            </main>

            <footer className="bottom-action">
                <button 
                    className="btn-save" 
                    onClick={() => console.log({ maestro: teacherData, horario })}
                >
                    GUARDAR REGISTRO DOCENTE
                </button>
            </footer>
        </div>
    );
};