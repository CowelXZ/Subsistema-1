import React from 'react';
import './RegistroUsuario.css';
import { Header } from '../common/Header';
import { Modal } from '../common/Modal';
import { CameraWidget } from '../common/CameraWidget'; // <--- El Widget Nuevo
import { useRegistroUsuario } from './useRegistroUsuario'; // <--- El Hook Nuevo


interface Props {
    onBack: () => void;
}

export const RegistroUsuario: React.FC<Props> = ({ onBack }) => {
    // 1. Instanciamos la lógica (El Hook hace todo el trabajo sucio)
    const logic = useRegistroUsuario();

    return (
        <div className="main-wrapper">
            <Header titulo="Registro de Nuevo Usuario" onBack={onBack} />

            <main className="dashboard-grid">

                {/* --- COLUMNA IZQUIERDA: FORMULARIO --- */}
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
                                    value={logic.formData.matricula}
                                    onChange={logic.handleChange}
                                    onKeyDown={(e) => e.key === 'Enter' && logic.buscarPorMatricula()}
                                />
                                <button type="button" className="search-btn" onClick={logic.buscarPorMatricula}>
                                    <span className="material-icons">search</span>
                                </button>
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Nombre(s)</label>
                            <input name="nombres" type="text" className="input-field" value={logic.formData.nombres} onChange={logic.handleChange} />
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Apellido Paterno</label>
                                <input name="apellidoPaterno" type="text" className="input-field" value={logic.formData.apellidoPaterno} onChange={logic.handleChange} />
                            </div>
                            <div className="form-group">
                                <label>Apellido Materno</label>
                                <input name="apellidoMaterno" type="text" placeholder="(Opcional)" className="input-field" value={logic.formData.apellidoMaterno} onChange={logic.handleChange} />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Grado</label>
                                <input name="grado" type="text" className="input-field" value={logic.formData.grado} onChange={logic.handleChange} />
                            </div>
                            <div className="form-group">
                                <label>Grupo</label>
                                <input name="grupo" type="text" className="input-field" value={logic.formData.grupo} onChange={logic.handleChange} />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Carrera</label>
                            <select name="carrera" className="input-field" value={logic.formData.carrera} onChange={logic.handleChange}>
                                <option value="">Seleccione una carrera...</option>
                                {logic.listaCarreras.map((item) => (
                                    <option key={item.idCarrera} value={item.NombreCarrera}>{item.NombreCarrera}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Sexo</label>
                            <div className="radio-group">
                                <label><input type="radio" name="sexo" value="M" checked={logic.formData.sexo === 'M'} onChange={logic.handleChange} /> Masculino</label>
                                <label><input type="radio" name="sexo" value="F" checked={logic.formData.sexo === 'F'} onChange={logic.handleChange} /> Femenino</label>
                                <label><input type="radio" name="sexo" value="NB" checked={logic.formData.sexo === 'NB'} onChange={logic.handleChange} /> No Binario</label>
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Observaciones</label>
                            <textarea name="observaciones" rows={2} className="input-field" value={logic.formData.observaciones} onChange={logic.handleChange}></textarea>
                        </div>
                    </form>
                </section>

                {/* --- COLUMNA DERECHA: CÁMARA (Usando el Widget Reutilizable) --- */}
                <CameraWidget
                    imgSrc={logic.imgSrc}
                    webcamRef={logic.webcamRef}
                    onCapture={logic.capturarFoto}
                    onRetake={logic.limpiarFoto}
                    accessStatus={logic.accessStatus}
                    setAccessStatus={logic.setAccessStatus}
                />

            </main>

            <footer className="bottom-action">
                <button className="btn-save" onClick={() => logic.setShowConfirmModal(true)}>
                    GUARDAR REGISTRO
                </button>
            </footer>

            {/* --- MODALES --- */}

            {/* 1. Modal de Confirmación */}
            <Modal isOpen={logic.showConfirmModal} onClose={() => logic.setShowConfirmModal(false)} title="Confirmación">
                <div style={{ textAlign: 'center' }}>
                    <span className="material-icons" style={{ fontSize: '48px', color: '#28a745', marginBottom: '15px' }}>check_circle</span>
                    <p>¿Estás seguro que deseas guardar los datos de <strong>{logic.formData.nombres}</strong>?</p>
                    <div className="modal-actions" style={{ justifyContent: 'center' }}>
                        <button className="btn-clean" onClick={() => logic.setShowConfirmModal(false)}>Cancelar</button>
                        <button className="btn-capture" onClick={() => {
                            logic.setShowConfirmModal(false);
                            logic.guardarEnBaseDeDatos(); // <--- Aquí se dispara el guardado real
                        }}>Confirmar</button>
                    </div>
                </div>
            </Modal>

            {/* 2. Modal de Alertas (Éxito/Error) */}
            <Modal isOpen={logic.alertModal.isOpen} onClose={logic.closeAlert} title={logic.alertModal.title}>
                <div style={{ textAlign: 'center' }}>
                    <span className="material-icons" style={{ fontSize: '48px', marginBottom: '15px', color: logic.alertModal.type === 'success' ? '#28a745' : logic.alertModal.type === 'error' ? '#dc3545' : '#e67e22' }}>
                        {logic.alertModal.type === 'success' ? 'check_circle' : logic.alertModal.type === 'error' ? 'error' : 'info'}
                    </span>
                    <p>{logic.alertModal.message}</p>
                    <div className="modal-actions" style={{ justifyContent: 'center' }}>
                        <button className="btn-capture" onClick={logic.closeAlert}>Entendido</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};