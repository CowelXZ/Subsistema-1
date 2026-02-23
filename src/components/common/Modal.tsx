import React from 'react';
import './Modal.css';

interface ModalProps {
    isOpen: boolean;          // ¿Está abierto?
    onClose: () => void;      // Función para cerrar
    title: string;            // Título de la ventana
    children: React.ReactNode; // El contenido (texto, form, botones, etc.)
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
    // Si no está abierto, no renderizamos nada (invisible)
    if (!isOpen) return null;

    return (
        <div className="modal-backdrop">
            <div className="modal-container animate-pop-in">

                {/* Cabecera del Modal */}
                <div className="modal-header">
                    <h3>{title}</h3>
                    <button onClick={onClose} className="btn-close-modal">
                        <span className="material-icons">close</span>
                    </button>
                </div>

                {/* Contenido Dinámico */}
                <div className="modal-body">
                    {children}
                </div>

            </div>
        </div>
    );
};