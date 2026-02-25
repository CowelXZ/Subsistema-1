import React, { useState, useRef, useCallback, useEffect } from 'react';
import './RegistroMaestros.css';
import { Header } from './common/Header';
import Webcam from 'react-webcam';

interface Props {
    onBack: () => void;
}

// ¡Adiós al sábado ('S')!
type DiaSemana = 'L' | 'M' | 'MM' | 'J' | 'V';

interface Asignatura {
    id: number;
    materia: string;
    horaInicio: string;
    horaFin: string;
    dias: DiaSemana[];
    semestre: string;
    grupo: string;
    carrera: string;
    salon: string;
    idarea: string;
}

export const RegistroMaestros: React.FC<Props> = ({ onBack }) => {
    // --- ESTADO: Listas desde BD ---
    const [listaCarreras, setListaCarreras] = useState<any[]>([]);
    const [listaMaterias, setListaMaterias] = useState<any[]>([]); 

    useEffect(() => {
        fetch('http://localhost:3000/api/carreras')
            .then(res => res.json())
            .then(data => setListaCarreras(data))
            .catch(err => console.error("Error cargando carreras:", err));

        fetch('http://localhost:3000/api/materias')
            .then(res => res.json())
            .then(data => setListaMaterias(data))
            .catch(err => console.error("Error cargando materias:", err));
    }, []);

    // --- ESTADO: Datos del Maestro (Sin Grado Académico) ---
    const [teacherData, setTeacherData] = useState({
        numeroEmpleado: '',
        nombres: '',
        apellidoPaterno: '',
        apellidoMaterno: '',
        correo: '',
        sexo: 'M',
        observaciones: ''
    });

    // --- ESTADO: Horario y Nueva Materia ---
    const [horario, setHorario] = useState<Asignatura[]>([]);

    const [nuevaMateria, setNuevaMateria] = useState({
        materia: '',
        horaInicio: '',
        horaFin: '',
        dias: [] as DiaSemana[],
        semestre: '1',
        grupo: 'A',
        carrera: '',
        salon: 'AULA 1',
        idarea: '1'
    });

    // --- CÁMARA ---
    const [imgSrc, setImgSrc] = useState<string | null>(null);
    const webcamRef = useRef<Webcam>(null);

    const capturarFoto = useCallback(() => {
        if (webcamRef.current) {
            setImgSrc(webcamRef.current.getScreenshot());
        }
    }, [webcamRef]);

    const limpiarFoto = () => setImgSrc(null);

    // --- MANEJADORES DE CAMBIOS ---
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setTeacherData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleMateriaChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setNuevaMateria(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const toggleDia = (dia: DiaSemana) => {
        setNuevaMateria(prev => ({
            ...prev,
            dias: prev.dias.includes(dia) ? prev.dias.filter(d => d !== dia) : [...prev.dias, dia]
        }));
    };

    // --- LÓGICA DE AGREGAR/ELIMINAR MATERIA ---
    const agregarMateria = () => {
        if (!nuevaMateria.materia || !nuevaMateria.horaInicio || !nuevaMateria.horaFin || nuevaMateria.dias.length === 0) {
            alert("Por favor completa todos los campos del horario (Materia, Horas y Días).");
            return;
        }

        setHorario([...horario, { id: Date.now(), ...nuevaMateria }]);
        
        setNuevaMateria(prev => ({ 
            ...prev, 
            materia: '', 
            horaInicio: '', 
            horaFin: '', 
            dias: [] 
        }));
    };

    const eliminarMateria = (id: number) => setHorario(horario.filter(h => h.id !== id));

    // --- GUARDAR EN BASE DE DATOS ---
    const guardarEnBaseDeDatos = async () => {
        if (!teacherData.numeroEmpleado || !teacherData.nombres) {
            alert("El número de empleado y el nombre son obligatorios.");
            return;
        }

        try {
            const datosParaEnviar = {
                ...teacherData,
                fotoBase64: imgSrc,
                horario: horario 
            };

            const respuesta = await fetch('http://localhost:3000/api/maestros/crear', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datosParaEnviar)
            });

            if (respuesta.ok) {
                alert("✅ ¡Maestro y Horarios Guardados Exitosamente!");
                setImgSrc(null);
                setHorario([]);
                // Reiniciamos los campos
                setTeacherData({ 
                    numeroEmpleado: '', nombres: '', apellidoPaterno: '', apellidoMaterno: '',
                    correo: '', sexo: 'M', observaciones: '' 
                });
            } else {
                const errorTexto = await respuesta.text();
                alert("❌ Error al guardar: " + errorTexto);
            }
        } catch (error) {
            console.error(error);
            alert("Error de conexión con el servidor.");
        }
    };

    // --- BÚSQUEDA DE EMPLEADO EXISTENTE ---
    const buscarPorEmpleado = async () => {
        if (!teacherData.numeroEmpleado) return;
        try {
            const res = await fetch(`http://localhost:3000/api/usuarios/${teacherData.numeroEmpleado}`);
            if (res.ok) {
                const data = await res.json();
                setTeacherData(prev => ({
                    ...prev,
                    nombres: data.nombres,
                    apellidoPaterno: data.apellidoPaterno,
                    apellidoMaterno: data.apellidoMaterno || '',
                    correo: data.observaciones || '', 
                    sexo: data.sexo || 'M'
                }));
                if (data.foto) setImgSrc(data.foto);
                alert("Docente encontrado. Modo edición activado.");
            } else {
                alert("Docente no encontrado. Puedes registrarlo como nuevo.");
            }
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="main-wrapper">
            <Header titulo="Registro de Maestros" onBack={onBack} />

            <main className="dashboard-grid maestros-grid">

                {/* --- COLUMNA IZQUIERDA --- */}
                <div className="left-column-stack">
                    <section className="card">
                        <div className="card-header">
                            <h2>Datos del Maestro</h2>
                        </div>
                        <form className="user-form">
                            <div className="form-group">
                                <label>Número de Empleado</label>
                                <div className="search-wrapper">
                                    <input 
                                        name="numeroEmpleado" 
                                        type="text" 
                                        className="input-field search-input" 
                                        value={teacherData.numeroEmpleado} 
                                        onChange={handleChange} 
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                buscarPorEmpleado();
                                            }
                                        }} 
                                    />
                                    <button type="button" className="search-btn" onClick={buscarPorEmpleado}>
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
                                    <label>Ap. Paterno</label>
                                    <input name="apellidoPaterno" type="text" className="input-field" value={teacherData.apellidoPaterno} onChange={handleChange} />
                                </div>
                                <div className="form-group">
                                    <label>Ap. Materno</label>
                                    <input name="apellidoMaterno" type="text" className="input-field" value={teacherData.apellidoMaterno} onChange={handleChange} />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Correo Institucional</label>
                                <input name="correo" type="email" className="input-field" value={teacherData.correo} onChange={handleChange} />
                            </div>
                            
                            <div className="form-group">
                                <label>Sexo</label>
                                <div className="radio-group">
                                    <label><input type="radio" name="sexo" value="M" checked={teacherData.sexo === 'M'} onChange={handleChange} /> Masculino</label>
                                    <label><input type="radio" name="sexo" value="F" checked={teacherData.sexo === 'F'} onChange={handleChange} /> Femenino</label>
                                    <label><input type="radio" name="sexo" value="NB" checked={teacherData.sexo === 'NB'} onChange={handleChange} /> No Binario</label>
                                </div>
                            </div>
                        </form>
                    </section>

                    {/* REGISTRO DE HORAS */}
                    <section className="card hours-section">
                        <div className="card-header">
                            <h2>Agregar Materia</h2>
                        </div>
                        <div className="user-form">
                            
                            <div className="form-group">
                                <label>Materia</label>
                                <select 
                                    name="materia" 
                                    className="input-field" 
                                    value={nuevaMateria.materia} 
                                    onChange={handleMateriaChange}
                                >
                                    <option value="">Seleccione una materia...</option>
                                    {listaMaterias.map((m, index) => (
                                        <option key={index} value={m.Materia}>
                                            {m.Materia}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Carrera</label>
                                    <select name="carrera" className="input-field" value={nuevaMateria.carrera} onChange={handleMateriaChange}>
                                        <option value="">Seleccione...</option>
                                        {listaCarreras.map(c => (
                                            <option key={c.idCarrera} value={c.NombreCarrera}>{c.NombreCarrera}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Salón / Área</label>
                                    <select name="salon" className="input-field" value={nuevaMateria.salon} onChange={handleMateriaChange}>
                                        <option value="AULA 1">AULA 1</option>
                                        <option value="AULA 2">AULA 2</option>
                                        <option value="AULA 3">AULA 3</option>
                                        <option value="LABORATORIO 1">LABORATORIO 1</option>
                                        <option value="LABORATORIO 2">LABORATORIO 2</option>
                                        <option value="CENTRO DE CÓMPUTO">CENTRO DE CÓMPUTO</option>
                                    </select>
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Semestre</label>
                                    <select name="semestre" className="input-field" value={nuevaMateria.semestre} onChange={handleMateriaChange}>
                                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(s => (
                                            <option key={s} value={s}>{s}° Semestre</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Grupo</label>
                                    <select name="grupo" className="input-field" value={nuevaMateria.grupo} onChange={handleMateriaChange}>
                                        {['A', 'B', 'C', 'D', 'E', 'F', 'G'].map(g => (
                                            <option key={g} value={g}>Grupo {g}</option>
                                        ))}
                                    </select>
                                </div>
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
                                    {/* ¡Adiós al botón de Sábado! */}
                                    {['L', 'M', 'MM', 'J', 'V'].map(dia => (
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
                                <span className="material-icons">add_circle</span> AGREGAR MATERIA
                            </button>
                        </div>
                    </section>
                </div>

                {/* --- COLUMNA DERECHA --- */}
                <div className="right-column-stack">
                    <section className="card schedule-card">
                        <div className="card-header">
                            <h2>Horario Asignado ({horario.length})</h2>
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
                                            <th>Grupo/Sem</th>
                                            <th className="text-center">Horario</th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {horario.map(item => (
                                            <tr key={item.id}>
                                                <td className="fw-bold">
                                                    {item.materia}<br/>
                                                    <small>{item.carrera || 'N/A'} - {item.salon}</small>
                                                </td>
                                                <td>{item.semestre}° {item.grupo}</td>
                                                <td className="text-center text-sm">
                                                    {item.horaInicio} - {item.horaFin}
                                                    <div className="days-badge-group" style={{marginTop: '4px'}}>
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

                    {/* CÁMARA */}
                    <section className="card camera-card-compact">
                        <div className="card-header compact-header">
                            <h2>Fotografía</h2>
                            {!imgSrc && (
                                <button className="btn-outline btn-sm" onClick={capturarFoto}>
                                    <span className="material-icons">photo_camera</span> Capturar
                                </button>
                            )}
                        </div>
                        <div className="camera-container compact-view">
                            <div className="camera-viewport viewport-sm">
                                {imgSrc ? (
                                    <img src={imgSrc} className="video-feed" alt="Captura de docente" />
                                ) : (
                                    <Webcam 
                                        audio={false} 
                                        ref={webcamRef} 
                                        screenshotFormat="image/jpeg" 
                                        className="video-feed" 
                                        videoConstraints={{ facingMode: "user" }} 
                                    />
                                )}
                            </div>
                        </div>
                        <div className="camera-actions compact-actions">
                            <div className="action-buttons-row">
                                {imgSrc ? (
                                    <button className="btn-clean btn-sm" onClick={limpiarFoto} type="button">
                                        <span className="material-icons">delete</span> Retomar Foto
                                    </button>
                                ) : (
                                    <button className="btn-capture btn-sm" onClick={capturarFoto} type="button">
                                        <span className="material-icons">camera_alt</span> Tomar Foto
                                    </button>
                                )}
                            </div>
                        </div>
                    </section>
                </div>
            </main>

            <footer className="bottom-action">
                <button className="btn-save" onClick={guardarEnBaseDeDatos}>
                    GUARDAR REGISTRO DOCENTE
                </button>
            </footer>
        </div>
    );
};