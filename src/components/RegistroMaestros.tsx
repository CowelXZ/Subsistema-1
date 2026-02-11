import { useState } from 'react';

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
        facultad: 'F.C.A.T.',
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

    const [accessStatus, setAccessStatus] = useState<'permitido' | 'denegado'>('permitido');

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
        setNuevaMateria({ materia: '', horaInicio: '', horaFin: '', dias: [] });
    };

    // Eliminar materia de la lista
    const eliminarMateria = (id: number) => {
        setHorario(horario.filter(h => h.id !== id));
    };

    return (
        <div className="main-wrapper">
            {/* --- HEADER --- */}
            <header className="top-bar">
                <img src="/img/logo-fcat.jpg" alt="FCAT" className="top-logo" />
                <h1>Registro de Maestros</h1>
                <img src="/img/logo-uat.jpeg" alt="UAT" className="top-logo" />
            </header>

            <main className="dashboard-grid">
                
                {/* --- COLUMNA IZQUIERDA --- */}
                <div className="left-column">
                    
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
                                <div className="form-group">
                                    <label>Facultad</label>
                                    <input name="facultad" type="text" className="input-field" value={teacherData.facultad} onChange={handleChange} />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Correo Institucional</label>
                                <input name="correo" type="email" className="input-field" value={teacherData.correo} onChange={handleChange} />
                            </div>
                        </form>
                    </section>

                    {/* SECCIÓN 2: REGISTRO DE HORAS (NUEVO) */}
                    <section className="card" style={{ marginTop: '20px', borderTop: '4px solid #d97706' }}>
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
                                <label style={{marginBottom: '10px', display: 'block'}}>Días de Clase</label>
                                <div className="days-selector" style={{display: 'flex', gap: '8px', justifyContent: 'center'}}>
                                    {['L', 'M', 'X', 'J', 'V', 'S'].map((dia) => (
                                        <button
                                            key={dia}
                                            type="button"
                                            onClick={() => toggleDia(dia as DiaSemana)}
                                            style={{
                                                width: '35px',
                                                height: '35px',
                                                borderRadius: '50%',
                                                border: 'none',
                                                fontWeight: 'bold',
                                                cursor: 'pointer',
                                                backgroundColor: nuevaMateria.dias.includes(dia as DiaSemana) ? '#800000' : '#e5e7eb', // Guinda activo, Gris inactivo
                                                color: nuevaMateria.dias.includes(dia as DiaSemana) ? 'white' : '#374151'
                                            }}
                                        >
                                            {dia}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button 
                                type="button" 
                                onClick={agregarMateria}
                                style={{
                                    width: '100%', 
                                    padding: '10px', 
                                    backgroundColor: '#d97706', 
                                    color: 'white', 
                                    border: 'none', 
                                    borderRadius: '5px', 
                                    marginTop: '10px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer'
                                }}
                            >
                                + AGREGAR HORA
                            </button>
                        </div>
                    </section>
                </div>

                {/* --- COLUMNA DERECHA --- */}
                <div className="right-column" style={{ display: 'flex', flexDirection: 'column', gap: '20px'}}>
                    
                    {/* SECCIÓN 3: LISTA DE HORARIOS (ARRIBA) */}
                    <section className="card" style={{ flex: '1', minHeight: '300px' }}>
                        <div className="card-header">
                            <h2>Horario Asignado</h2>
                        </div>
                        <div className="schedule-list" style={{ overflowY: 'auto', maxHeight: '350px', padding: '10px' }}>
                            {horario.length === 0 ? (
                                <p style={{textAlign: 'center', color: '#888', fontStyle: 'italic'}}>No hay materias asignadas.</p>
                            ) : (
                                <table style={{width: '100%', borderCollapse: 'collapse'}}>
                                    <thead>
                                        <tr style={{borderBottom: '1px solid #ddd', fontSize: '0.9rem', color: '#666'}}>
                                            <th style={{textAlign: 'left', padding: '8px'}}>Materia</th>
                                            <th style={{padding: '8px'}}>Horario</th>
                                            <th style={{padding: '8px'}}>Días</th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {horario.map((item) => (
                                            <tr key={item.id} style={{borderBottom: '1px solid #eee'}}>
                                                <td style={{padding: '10px', fontWeight: '500'}}>{item.materia}</td>
                                                <td style={{padding: '10px', textAlign: 'center', fontSize: '0.9rem'}}>
                                                    {item.horaInicio} - {item.horaFin}
                                                </td>
                                                <td style={{padding: '10px', textAlign: 'center'}}>
                                                    {item.dias.map(d => (
                                                        <span key={d} style={{
                                                            display: 'inline-block',
                                                            backgroundColor: '#800000',
                                                            color: 'white',
                                                            fontSize: '0.7rem',
                                                            padding: '2px 5px',
                                                            borderRadius: '3px',
                                                            marginRight: '2px'
                                                        }}>{d}</span>
                                                    ))}
                                                </td>
                                                <td style={{textAlign: 'center'}}>
                                                    <button 
                                                        onClick={() => eliminarMateria(item.id)}
                                                        style={{background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer'}}
                                                    >
                                                        <span className="material-icons" style={{fontSize: '18px'}}>delete</span>
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
                    <section className="card" style={{ flex: '0 0 auto' }}>
                        <div className="card-header" style={{ padding: '10px 15px' }}>
                            <h2 style={{ fontSize: '1.2rem' }}>Fotografía</h2>
                            <button className="btn-outline" style={{ padding: '5px 10px', fontSize: '0.8rem' }}>
                                <span className="material-icons" style={{ fontSize: '16px' }}>photo_camera</span> Activar
                            </button>
                        </div>

                        <div className="camera-container" style={{ padding: '10px' }}>
                            <div className="camera-viewport" style={{ height: '180px' }}> {/* Altura reducida */}
                                <img src="/img/video-placeholder.png" alt="Vista Previa" className="video-feed" style={{height: '100%', objectFit: 'cover'}} />
                            </div>
                        </div>

                        <div className="camera-actions" style={{ marginTop: '10px', paddingBottom: '15px' }}>
                            <div className="action-buttons-row" style={{ gap: '10px' }}>
                                <button className="btn-capture" style={{ flex: 1, padding: '8px' }}>
                                    Capturar
                                </button>
                                <button className="btn-clean" style={{ flex: 1, padding: '8px' }}>
                                    Limpiar
                                </button>
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