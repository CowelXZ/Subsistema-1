
import { useState, useEffect, useRef, useCallback } from 'react';
import './RegistroUsuario.css';
import Webcam from 'react-webcam';
import { Header } from './common/Header';
interface Props {
    onBack: () => void;
}

export const RegistroUsuario: React.FC<Props> = ({ onBack }) => {
    // Estado para guardar las carreras que traemos de la BD
    const [listaCarreras, setListaCarreras] = useState<any[]>([]);

    // useEffect se ejecuta una vez al cargar la página
    useEffect(() => {
        fetch('http://localhost:3000/api/carreras')
            .then(res => res.json())
            .then(data => setListaCarreras(data))
            .catch(err => console.error("Error cargando carreras:", err));
    }, []);
    // --- ESTADO (Los datos del formulario) ---
    const [formData, setFormData] = useState({
        matricula: '',
        nombres: '',
        apellidoPaterno: '',
        apellidoMaterno: '',
        grado: '',
        grupo: '',
        carrera: 'Contador Público',
        sexo: 'M',
        observaciones: ''
    });

    // 1. Estado para la foto capturada (será un string largo Base64)
    const [imgSrc, setImgSrc] = useState<string | null>(null);

    // 2. Referencia para controlar la cámara
    const webcamRef = useRef<Webcam>(null);

    // 3. Función para capturar la foto
    const capturarFoto = useCallback(() => {
        if (webcamRef.current) {
            const imageSrc = webcamRef.current.getScreenshot();
            setImgSrc(imageSrc); // Guardamos la foto en el estado
        }
    }, [webcamRef]);

    // 4. Función para limpiar/retomar foto
    const limpiarFoto = () => {
        setImgSrc(null);
    }

    const [accessStatus, setAccessStatus] = useState<'permitido' | 'denegado'>('permitido');

    // Función genérica para guardar lo que escribas
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const guardarEnBaseDeDatos = async () => {
        // 1. Validaciones básicas
        if (!formData.matricula || !formData.nombres) {
            alert("Por favor llena la matrícula y el nombre");
            return;
        }
        if (!imgSrc) {
            if (!confirm("¿Seguro que quieres guardar sin foto?")) return;
        }

        try {
            // 2. Preparamos el paquete de datos
            const datosParaEnviar = {
                ...formData,    // Todos los inputs (matricula, nombre, carrera...)
                fotoBase64: imgSrc // La foto capturada
            };

            // 3. Enviamos al Backend
            const respuesta = await fetch('http://localhost:3000/api/usuarios/crear', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datosParaEnviar)
            });

            if (respuesta.ok) {
                alert("✅ ¡Usuario Guardado Exitosamente!");
                // Opcional: Limpiar formulario
                setImgSrc(null);
                setFormData({ ...formData, matricula: '', nombres: '', apellidoPaterno: '' });
            } else {
                const errorData = await respuesta.text();
                alert("❌ Error al guardar: " + errorData);
            }

        } catch (error) {
            console.error(error);
            alert("Error de conexión con el servidor");
        }
    };

    const buscarPorMatricula = async () => {
        if (!formData.matricula) return; // No buscar si está vacío

        try {
            const res = await fetch(`http://localhost:3000/api/usuarios/${formData.matricula}`);

            if (res.ok) {
                const data = await res.json();

                // 1. Llenamos el formulario con los datos recibidos
                setFormData({
                    matricula: data.matricula,
                    nombres: data.nombres,
                    apellidoPaterno: data.apellidoPaterno,
                    apellidoMaterno: data.apellidoMaterno || '', // Manejar nulos
                    grado: '', // Estos datos no vienen en la tabla Usuarios, quizás dejarlos vacíos o buscarlos aparte
                    grupo: '',
                    carrera: data.carrera,
                    sexo: data.sexo, // 'M', 'F' o 'NB'
                    observaciones: data.observaciones || ''
                });

                // 2. Si trae foto, la mostramos
                if (data.foto) {
                    setImgSrc(data.foto);
                } else {
                    setImgSrc(null); // Si no tiene foto, limpiar para mostrar cámara en vivo
                }

                alert("Usuario encontrado. Modo Edición activado.");
            } else {
                alert("Usuario no encontrado (Puedes registrarlo como nuevo)");
                // Opcional: Limpiar campos si no existe
            }
        } catch (error) {
            console.error("Error buscando:", error);
        }
    };

    return (
        <div className="main-wrapper">
            {/* 3. Pásala al Header */}
            <Header titulo="Registro de Nuevo Usuario" onBack={onBack} />


            <main className="dashboard-grid">
                {/* --- COLUMNA IZQUIERDA: DATOS --- */}
                <section className="card">
                    <div className="card-header">
                        <div>
                            <h2>Datos del Usuario</h2>
                            <small>Datos Personales</small>
                        </div>
                    </div>

                    <form className="user-form" onSubmit={(e) => e.preventDefault()}>
                        <div className="form-group">
                            <label>Matrícula</label>
                            <div className="search-wrapper">
                                <input
                                    name="matricula"
                                    type="text"
                                    placeholder="Buscar matrícula..."
                                    className="input-field search-input"
                                    value={formData.matricula}
                                    onChange={handleChange}
                                    // Truco: Buscar al presionar Enter
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault(); // Evita que se envíe el form
                                            buscarPorMatricula();
                                        }
                                    }}
                                />
                                {/* Botón de lupa */}
                                <button type="button" className="search-btn" onClick={buscarPorMatricula}>
                                    <span className="material-icons">search</span>
                                </button>
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Nombre(s)</label>
                            <input name="nombres" type="text" className="input-field" value={formData.nombres} onChange={handleChange} />
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Apellido Paterno</label>
                                <input name="apellidoPaterno" type="text" className="input-field" value={formData.apellidoPaterno} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label>Apellido Materno</label>
                                <input name="apellidoMaterno" type="text" placeholder="(Opcional)" className="input-field" value={formData.apellidoMaterno} onChange={handleChange} />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Grado</label>
                                <input name="grado" type="text" className="input-field" value={formData.grado} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label>Grupo</label>
                                <input name="grupo" type="text" className="input-field" value={formData.grupo} onChange={handleChange} />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Carrera</label>
                            <select
                                className="form-control" // O la clase que uses
                                name="carrera"
                                value={formData.carrera}
                                onChange={handleChange}
                            // Aquí deberías tener tu onChange y value si ya los usabas
                            >
                                <option value="">Seleccione una carrera...</option>

                                {/* Aquí hacemos el ciclo (map) para pintar las opciones de la BD */}
                                {listaCarreras.map((item) => (
                                    <option key={item.idCarrera} value={item.NombreCarrera}>
                                        {item.NombreCarrera}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Sexo</label>
                            <div className="radio-group">
                                <label>
                                    <input type="radio" name="sexo" value="M" checked={formData.sexo === 'M'} onChange={handleChange} /> Masculino
                                </label>
                                <label>
                                    <input type="radio" name="sexo" value="F" checked={formData.sexo === 'F'} onChange={handleChange} /> Femenino
                                </label>
                                {/* Nueva opción No Binario */}
                                <label>
                                    <input type="radio" name="sexo" value="NB" checked={formData.sexo === 'NB'} onChange={handleChange} /> No Binario
                                </label>
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Observaciones</label>
                            <textarea name="observaciones" rows={2} className="input-field" value={formData.observaciones} onChange={handleChange}></textarea>
                        </div>
                    </form>
                </section>

                {/* --- COLUMNA DERECHA: CÁMARA --- */}
                <section className="card">
                    <div className="card-header">
                        <h2>Cámara</h2>
                        <button className="btn-outline">
                            <span className="material-icons">photo_camera</span> Activar Cámara
                        </button>
                    </div>

                    <div className="camera-container">
                        <div className="camera-viewport">
                            {imgSrc ? (
                                // CASO 1: Si ya tomamos foto, mostramos la imagen congelada
                                <img src={imgSrc} alt="Captura" className="video-feed" />
                            ) : (
                                // CASO 2: Si no hay foto, mostramos video en vivo
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

                    <div className="status-section">
                        <label>Estado de Acceso</label>
                        <div className="status-toggle-group">
                            {/* Opción Permitido */}
                            <label
                                // Si accessStatus es 'permitido', se agrega la clase 'success-opt'
                                className={`status-option ${accessStatus === 'permitido' ? 'success-opt' : ''}`}
                            >
                                <input
                                    type="radio"
                                    name="access_status"
                                    checked={accessStatus === 'permitido'}
                                    onChange={() => setAccessStatus('permitido')}
                                    style={{ display: 'none' }}
                                />
                                <span className="material-icons">check_circle</span> PERMITIDO
                            </label>

                            {/* Opción Denegado */}
                            <label
                                // Si accessStatus es 'denegado', se agrega la clase 'danger-opt'
                                className={`status-option ${accessStatus === 'denegado' ? 'danger-opt' : ''}`}
                            >
                                <input
                                    type="radio"
                                    name="access_status"
                                    checked={accessStatus === 'denegado'}
                                    onChange={() => setAccessStatus('denegado')}
                                    style={{ display: 'none' }}
                                />
                                <span className="material-icons">cancel</span> DENEGADO
                            </label>
                        </div>
                    </div>

                    <div className="camera-actions" style={{ marginTop: '20px' }}>
                        <div className="action-buttons-row">
                            {imgSrc ? (
                                // Si hay foto, mostramos botón de borrar
                                <button className="btn-clean" onClick={limpiarFoto} type="button">
                                    <span className="material-icons">delete</span> Retomar
                                </button>
                            ) : (
                                // Si no hay foto, mostramos botón de capturar
                                <button className="btn-capture" onClick={capturarFoto} type="button">
                                    <span className="material-icons">camera_alt</span> Capturar
                                </button>
                            )}
                        </div>
                    </div>
                </section>
            </main>

            <footer className="bottom-action">
                <button className="btn-save" onClick={guardarEnBaseDeDatos}>GUARDAR REGISTRO</button>
            </footer>
        </div>
    );
};