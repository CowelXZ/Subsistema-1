import React from 'react';

interface HeaderProps {
    titulo: string;
    onBack?: () => void;
    rightAction?: React.ReactNode; // <--- NUEVA PROPIEDAD OPCIONAL
}

export const Header: React.FC<HeaderProps> = ({ titulo, onBack, rightAction }) => {
    return (
        <header className="top-bar">
            {/* --- IZQUIERDA: Botón + Logo UAT --- */}
            <div className="header-left">
                {onBack && (
                    <button onClick={onBack} className="btn-header-back" title="Volver">
                        <span className="material-icons">arrow_back</span>
                    </button>
                )}
                <img src="/img/logo-uat.jpeg" alt="UAT" className="top-logo" />
            </div>

            {/* --- CENTRO: Título --- */}
            <h1 className="header-title" style={{ position: 'relative', right: '60px', textAlign: 'center' }}>
                {titulo}
            </h1>

            {/* --- DERECHA: Logo FCAT + Acción Extra --- */}
            <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <img
                    src="/img/FCAT_nuevo.jpeg"
                    alt="FCAT"
                    className="top-logo"
                    style={{ flexShrink: 0, height: '80px' }} /* <--- Agregamos esto */
                />
                {rightAction}
            </div>
        </header>
    );
};