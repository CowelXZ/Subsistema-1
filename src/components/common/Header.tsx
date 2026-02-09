// src/components/common/Header.tsx
import React from 'react';

interface HeaderProps {
    titulo: string;
}

export const Header: React.FC<HeaderProps> = ({ titulo }) => {
    return (
        <header className="top-bar">
            <img src="/img/logo-fcat.jpg" alt="FCAT" className="top-logo" />
            <h1>{titulo}</h1>
            <img src="/img/logo-uat.jpeg" alt="UAT" className="top-logo" />
        </header>
    );
};