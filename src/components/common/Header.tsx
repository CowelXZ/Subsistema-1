import React from 'react';

interface HeaderProps {
    titulo: string;
    onBack?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ titulo, onBack }) => {
    return (
        <header className="top-bar">

            {/* --- IZQUIERDA: Botón + Logo UAT --- */}
            <div className="header-left">
                {onBack && (
                    <button
                        onClick={onBack}
                        className="btn-header-back" // Clase nueva
                        title="Volver"
                    >
                        <span className="material-icons">arrow_back</span>
                    </button>
                )}
                <img src="/img/logo-uat.jpeg" alt="UAT" className="top-logo" />
            </div>

            {/* --- CENTRO: Título --- */}
            <h1 className="header-title">{titulo}</h1>

            {/* --- DERECHA: Logo FCAT --- */}
            <div className="header-right">
                <img src="/img/logo-fcat.png" alt="FCAT" className="top-logo" />
            </div>

        </header>
    );
};