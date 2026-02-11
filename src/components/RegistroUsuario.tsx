import { useState } from 'react';
import './RegistroUsuario.css';
import { Header } from './common/Header';
interface Props {
    onBack: () => void;
}

export const RegistroUsuario: React.FC<Props> = ({ onBack }) => {
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

    const [accessStatus, setAccessStatus] = useState<'permitido' | 'denegado'>('permitido');

    // Función genérica para guardar lo que escribas
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
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
                                />
                                <button type="button" className="search-btn">
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
                            <select name="carrera" className="input-field" value={formData.carrera} onChange={handleChange}>
                                <option>Contador Público</option>
                                <option>Lic. en Administración</option>
                                <option>Lic en Negocios Internacionales</option>
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
                                <label>
                                    <input type="radio" name="sexo" value="N/A" checked={formData.sexo === 'N/A'} onChange={handleChange} /> No Especificado
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
                            <img src="/img/foto-logo2.jpg" alt="Vista Previa" className="video-feed" />
                        </div>
                        <div className="thumbnails">
                            <div className="thumb"></div>
                            <div className="thumb"></div>
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
                            <button className="btn-capture">
                                <span className="material-icons">camera_alt</span> Capturar
                            </button>
                            <button className="btn-clean">
                                <span className="material-icons">delete</span> Limpiar
                            </button>
                        </div>
                    </div>
                </section>
            </main>

            <footer className="bottom-action">
                <button className="btn-save" onClick={() => alert(JSON.stringify(formData))}>GUARDAR REGISTRO</button>
            </footer>
        </div>
    );
};