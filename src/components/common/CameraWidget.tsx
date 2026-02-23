import React from 'react';
import Webcam from 'react-webcam';

interface Props {
    imgSrc: string | null;
    // CORRECCIÓN AQUÍ: Agregamos "| null" para que TypeScript no se queje
    webcamRef: React.RefObject<Webcam | null>;
    onCapture: () => void;
    onRetake: () => void;
    accessStatus?: 'permitido' | 'denegado';
    setAccessStatus?: (status: 'permitido' | 'denegado') => void;
}

export const CameraWidget: React.FC<Props> = ({
    imgSrc, webcamRef, onCapture, onRetake, accessStatus, setAccessStatus
}) => {
    return (
        <section className="card">
            <div className="card-header">
                <h2>Cámara</h2>
                <button className="btn-outline">
                    <span className="material-icons">photo_camera</span> Activar
                </button>
            </div>

            <div className="camera-container">
                <div className="camera-viewport">
                    {imgSrc ? (
                        <img src={imgSrc} alt="Captura" className="video-feed" />
                    ) : (
                        <Webcam
                            audio={false}
                            ref={webcamRef} // Ahora sí aceptará la referencia sin chistar
                            screenshotFormat="image/jpeg"
                            className="video-feed"
                            videoConstraints={{ facingMode: "user" }}
                        />
                    )}
                </div>
            </div>

            {/* Sección de Status (Solo se muestra si le pasas las props) */}
            {accessStatus && setAccessStatus && (
                <div className="status-section">
                    <label>Estado de Acceso</label>
                    <div className="status-toggle-group">
                        <label className={`status-option ${accessStatus === 'permitido' ? 'success-opt' : ''}`}>
                            <input
                                type="radio"
                                checked={accessStatus === 'permitido'}
                                onChange={() => setAccessStatus('permitido')}
                                style={{ display: 'none' }}
                            />
                            <span className="material-icons">check_circle</span> PERMITIDO
                        </label>

                        <label className={`status-option ${accessStatus === 'denegado' ? 'danger-opt' : ''}`}>
                            <input
                                type="radio"
                                checked={accessStatus === 'denegado'}
                                onChange={() => setAccessStatus('denegado')}
                                style={{ display: 'none' }}
                            />
                            <span className="material-icons">cancel</span> DENEGADO
                        </label>
                    </div>
                </div>
            )}

            <div className="camera-actions" style={{ marginTop: '20px' }}>
                <div className="action-buttons-row">
                    {imgSrc ? (
                        <button className="btn-clean" onClick={onRetake} type="button">
                            <span className="material-icons">delete</span> Retomar
                        </button>
                    ) : (
                        <button className="btn-capture" onClick={onCapture} type="button">
                            <span className="material-icons">camera_alt</span> Capturar
                        </button>
                    )}
                </div>
            </div>
        </section>
    );
};