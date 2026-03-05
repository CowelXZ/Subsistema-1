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
    const [listaAreas, setListaAreas] = useState<any[]>([]);
    const [listaSemestres, setListaSemestres] = useState<any[]>([]); // Nuevo estado
    const [listaLetrasGrupo, setListaLetrasGrupo] = useState<any[]>([]);

    // 1. AGREGA ESTA FUNCIÓN AQUÍ
    const cargarMaterias = () => {
        fetch('http://localhost:3000/api/materias')
            .then(res => res.json())
            .then(data => setListaMaterias(data))
            .catch(err => console.error("Error cargando materias:", err));
    };

    const cargarSemestres = () => {
    fetch('http://localhost:3000/api/semestres')
        .then(res => res.json())
        .then(data => setListaSemestres(data))
        .catch(err => console.error("Error cargando semestres:", err));
    };

    const cargarListasGrupos = () => {
    // Cargamos Semestres
    fetch('http://localhost:3000/api/semestres')
        .then(res => res.json())
        .then(data => setListaSemestres(data));

    // Cargamos Letras (A, B, C...)
    fetch('http://localhost:3000/api/grupos-letras')
        .then(res => res.json())
        .then(data => setListaLetrasGrupo(data));
    };

    useEffect(() => {
        fetch('http://localhost:3000/api/carreras')
            .then(res => res.json())
            .then(data => setListaCarreras(data));

        // 2. LLAMA A LA FUNCIÓN AQUÍ (reemplazando el fetch viejo de materias)
        cargarMaterias();

        cargarSemestres();

        cargarListasGrupos()

        fetch('http://localhost:3000/api/areas')
            .then(res => res.json())
            .then(data => {
                setListaAreas(data);
                if(data.length > 0) {
                    setNuevaMateria(prev => ({ ...prev, idarea: data[0].idArea.toString(), salon: data[0].Observaciones }));
                }
            });
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
    const toggleDia = (dia: DiaSemana) => {
        setNuevaMateria(prev => ({
            ...prev,
            dias: prev.dias.includes(dia) ? prev.dias.filter(d => d !== dia) : [...prev.dias, dia]
        }));
    };

    // --- LÓGICA DE AGREGAR/ELIMINAR MATERIA ---
    const agregarMateria = () => {
        let errores: string[] = [];

        // 1. Validaciones individuales y específicas (Dinámicas)
        if (!nuevaMateria.materia) {
            errores.push("• Materia: Escribe o selecciona una materia.");
        }
        if (!nuevaMateria.carrera) {
            errores.push("• Carrera: Selecciona la carrera.");
        }
        if (!nuevaMateria.semestre) {
            errores.push("• Semestre: Selecciona el semestre.");
        }
        if (!nuevaMateria.grupo) {
            errores.push("• Grupo: Selecciona la letra del grupo.");
        }
        if (!nuevaMateria.horaInicio) {
            errores.push("• Hora Inicio: Define a qué hora empieza la clase.");
        }
        if (!nuevaMateria.horaFin) {
            errores.push("• Hora Final: Define a qué hora termina la clase.");
        }
        if (nuevaMateria.dias.length === 0) {
            errores.push("• Días de Clase: Selecciona al menos un día (L, M, MM, J, V).");
        }

        // 2. Validar la lógica del tiempo (solo si ambas horas ya fueron ingresadas)
        if (nuevaMateria.horaInicio && nuevaMateria.horaFin) {
            if (nuevaMateria.horaInicio >= nuevaMateria.horaFin) {
                errores.push("• Horario inválido: La hora de inicio debe ser antes de la hora final.");
            }
        }

        // 3. Si la "bolsa de errores" tiene algo, mostramos la alerta dinámica
        if (errores.length > 0) {
            alert("⚠️ No se puede agregar la materia. Te falta completar:\n\n" + errores.join("\n"));
            return; 
        }

        // --- Si todo está correcto, se agrega al arreglo ---
        setHorario([...horario, { id: Date.now(), ...nuevaMateria }]);
        
        // Limpiamos solo los campos de la materia (dejamos carrera y grupo por si agrega otra igual)
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
        let errores: string[] = [];

        // 1. Validar Número de Empleado
        if (!teacherData.numeroEmpleado) {
            errores.push("• Número de Empleado: Falta ingresar el número.");
        } else if (!/^\d+$/.test(teacherData.numeroEmpleado)) {
            errores.push("• Número de Empleado: Solo se permiten números, borra cualquier letra o espacio.");
        }

        const regexLetras = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;

        // 2. Validar Nombres
        if (!teacherData.nombres) {
            errores.push("• Nombre(s): Falta ingresar el nombre.");
        } else if (!regexLetras.test(teacherData.nombres)) {
            errores.push("• Nombre(s): Solo se aceptan letras, revisa que no haya números o símbolos.");
        }

        // 3. Validar Apellido Paterno
        if (!teacherData.apellidoPaterno) {
            errores.push("• Ap. Paterno: Falta ingresar el apellido paterno.");
        } else if (!regexLetras.test(teacherData.apellidoPaterno)) {
            errores.push("• Ap. Paterno: Solo se aceptan letras, revisa que no haya números o símbolos.");
        }

        // 4. Validar Apellido Materno (Opcional)
        if (teacherData.apellidoMaterno && !regexLetras.test(teacherData.apellidoMaterno)) {
            errores.push("• Ap. Materno: Solo se aceptan letras, revisa que no haya números o símbolos.");
        }

        // 5. Validar Correo
        const regexCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!teacherData.correo) {
            errores.push("• Correo Institucional: Falta ingresar el correo.");
        } else if (!regexCorreo.test(teacherData.correo)) {
            errores.push("• Correo Institucional: El formato es incorrecto (ej. válido: usuario@uat.edu.mx).");
        }

        // Si encontramos al menos un error, lanzamos la alerta dinámica y detenemos todo
        if (errores.length > 0) {
            alert("⚠️ No se puede guardar el registro. Por favor revisa lo siguiente:\n\n" + errores.join("\n"));
            return; 
        }

        // --- Si llega hasta aquí, los datos están perfectos. Hacemos el fetch normal ---
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
                cargarMaterias();
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

    const handleTeacherChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        let valorFiltrado = value;

        // Validación 1: Número de Empleado (SOLO NÚMEROS)
        if (name === 'numeroEmpleado') {
            valorFiltrado = value.replace(/\D/g, ''); // Borra lo que NO sea número
        } 
        // Validación 2: Nombres y Apellidos (SOLO LETRAS Y ESPACIOS)
        else if (name === 'nombres' || name === 'apellidoPaterno' || name === 'apellidoMaterno') {
            valorFiltrado = value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, ''); // Borra números y símbolos
        }

        // Actualizamos el estado con el valor limpio
        setTeacherData(prev => ({ ...prev, [name]: valorFiltrado }));
    };


    // --- BÚSQUEDA DE MAESTRO Y HORARIO EXISTENTE ---
    const buscarMaestro = async () => {
        if (!teacherData.numeroEmpleado) return;

        try {
            const res = await fetch(`http://localhost:3000/api/maestros/buscar/${teacherData.numeroEmpleado}`);
            
            if (res.ok) {
                const data = await res.json();
                
                // 1. Llenamos los datos personales del maestro silenciosamente
                setTeacherData(prev => ({
                    ...prev,
                    nombres: data.maestro.Nombre || '',
                    apellidoPaterno: data.maestro.ApellidoPaterno || '',
                    apellidoMaterno: data.maestro.ApellidoMaterno || '',
                    correo: data.maestro.Correo || '',
                    // CAMBIO AQUÍ: Usamos 'M' para que coincida con el HTML de tus radio buttons
                    sexo: data.maestro.Sexo || 'M' 
                }));

                // 2. Cargamos la foto en el cuadro negro si existe
                if (data.maestro.Foto) {
                    setImgSrc(data.maestro.Foto); // Esto apaga la cámara y pone la foto de la base de datos
                } else {
                    setImgSrc(null); // Esto asegura que la cámara siga prendida si no hay foto
                }

                // 3. Traducimos y llenamos la tabla de materias
                const materiasMapeadas = data.materias.map((m: any, index: number) => {
                    let diasClase = [];
                    if (m.lunes === 1) diasClase.push('L');
                    if (m.martes === 1) diasClase.push('M');
                    if (m.miercoles === 1) diasClase.push('MM');
                    if (m.jueves === 1) diasClase.push('J');
                    if (m.viernes === 1) diasClase.push('V');

                    return {
                        id: Date.now() + index, 
                        materia: m.materia,
                        carrera: m.carrera,
                        semestre: m.semestre,
                        grupo: m.grupo,
                        horaInicio: m.horaInicio,
                        horaFin: m.horaFin,
                        dias: diasClase,
                        salon: m.salon
                    };
                });

                setHorario(materiasMapeadas);
                
            } else if (res.status === 404) {
                // Si no existe, limpiamos los campos y la tabla por si había datos de una búsqueda anterior
                setTeacherData(prev => ({
                    ...prev, nombres: '', apellidoPaterno: '', apellidoMaterno: '', correo: '', sexo: 'M'
                }));
                setHorario([]);
                setImgSrc(null);
            }
        } catch (error) {
            console.error("Error al buscar maestro:", error);
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
                                <div style={{ position: 'relative' }}>
                                    <input 
                                        type="text" 
                                        name="numeroEmpleado" 
                                        className="input-field" 
                                        value={teacherData.numeroEmpleado} 
                                        onChange={handleTeacherChange}
                                        onBlur={buscarMaestro} /* <-- AQUÍ SE LLAMA AL DAR CLIC AFUERA */
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault(); 
                                                buscarMaestro(); /* <-- AQUÍ SE LLAMA AL DAR ENTER */
                                            }
                                        }}
                                    />
                                    {/* Este es el icono de la lupa que ejecuta la búsqueda al darle clic */}
                                    <span 
                                        className="search-icon" 
                                        onClick={buscarMaestro} /* <-- AQUÍ SE LLAMA AL DAR CLIC EN LA LUPA */
                                        style={{ position: 'absolute', right: '10px', top: '10px', cursor: 'pointer' }}
                                    >
                                    </span>
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
                                {/* NUEVO CÓDIGO (La solución) */}
                            <input 
                                type="text"
                                list="opciones-materias"
                                name="materia" 
                                className="input-field" 
                                value={nuevaMateria.materia} 
                                onChange={handleMateriaChange}
                                placeholder="Seleccione o escriba una materia nueva..."
                                autoComplete="off"
                            />
                            <datalist id="opciones-materias">
                                {listaMaterias.map((m, index) => (
                                    <option key={index} value={m.Materia} />
                                ))}
                            </datalist>
                            </div>
                            
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Carrera</label>
                                    <select 
                                        name="carrera" 
                                        className="input-field" 
                                        value={nuevaMateria.carrera} 
                                        onChange={handleMateriaChange}
                                    >
                                        <option value="">Seleccione...</option>
                                        {listaCarreras.map((c, index) => (
                                            // Usamos el nombre de la carrera tanto para el valor como para el texto
                                            <option key={index} value={c.Carrera}>{c.Carrera}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Salón / Área</label>
                                    <select name="idarea" className="input-field" value={nuevaMateria.idarea} onChange={handleMateriaChange}>
                                        {listaAreas.map(a => (
                                            <option key={a.idArea} value={a.idArea}>{a.Observaciones}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="form-row">
                                {/* Selector de Semestre Dinámico */}
                                <div className="form-group">
                                    <label>Semestre</label>
                                    <select name="semestre" className="input-field" value={nuevaMateria.semestre} onChange={handleMateriaChange}>
                                        <option value="">Seleccione...</option>
                                        {listaSemestres.map((s, i) => (
                                            <option key={i} value={s.Semestre}>{s.Semestre}° Semestre</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Selector de Grupo Dinámico */}
                                <div className="form-group">
                                    <label>Grupo</label>
                                    <select name="grupo" className="input-field" value={nuevaMateria.grupo} onChange={handleMateriaChange}>
                                        <option value="">Seleccione...</option>
                                        {listaLetrasGrupo.map((g, i) => (
                                            <option key={i} value={g.Grupo}>Grupo {g.Grupo}</option>
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
                                    <label>Hora Final</label>
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
                            {/* Eliminamos el botón pequeño de aquí como lo pediste */}
                        </div>

                        <div className="camera-container compact-view">
                            <div className="camera-viewport viewport-sm">
                                {/* --- ZONA DE VISUALIZACIÓN --- */}
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

                            {/* --- ZONA DE BOTONES GRANDES (Con Iconos Profesionales) --- */}
                            <div className="camera-actions compact-actions" style={{ marginTop: '15px' }}>
                                <div className="action-buttons-row">
                                    {imgSrc ? (
                                        <button 
                                            type="button" 
                                            className="btn-add-hour" 
                                            onClick={() => setImgSrc(null)}
                                            // Agregamos fontSize para crecer la letra, y display flex para alinear el icono con el texto
                                            style={{ width: '100%', fontSize: '17px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                                        >
                                            <span className="material-icons">refresh</span> RETOMAR FOTO
                                        </button>
                                    ) : (
                                        <button 
                                            type="button" 
                                            className="btn-add-hour" 
                                            onClick={capturarFoto}
                                            style={{ width: '100%', fontSize: '17px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                                        >
                                            <span className="material-icons">photo_camera</span> CAPTURAR
                                        </button>
                                    )}
                                </div>
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