import React, { useEffect, useState } from 'react';
import { Header } from '../common/Header';

interface AccesoItem {
    idAcceso: number;
    matricula: string;
    nombreCompleto: string;
    tipoUsuario: string;
    materiaDestino: string | null;
    grupoDestino: string | null;
    maestroAsignado: string | null;
    aulaDestino: string | null;
    estatusAcceso: string;
    fechaHora: string;
}

interface Props {
    onBack: () => void;
}

export const ReportesView: React.FC<Props> = ({ onBack }) => {
    const [accesos, setAccesos] = useState<AccesoItem[]>([]);
    const [cargando, setCargando] = useState(true);

    // Filtros
    const [busqueda, setBusqueda] = useState('');
    const [filtroTipo, setFiltroTipo] = useState('TODOS');

    useEffect(() => {
        const cargarReportes = async () => {
            try {
                const response = await fetch('http://localhost:3000/api/reportes');
                if (response.ok) {
                    const data = await response.json();
                    setAccesos(data);
                }
            } catch (error) {
                console.error("Error al cargar reportes:", error);
            } finally {
                setCargando(false);
            }
        };
        cargarReportes();
    }, []);

    const formatearFechaHora = (fechaStr: string) => {
        const fecha = new Date(fechaStr);
        return {
            fecha: fecha.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' }),
            hora: fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        };
    };

    // Filtrado en tiempo real
    const registrosFiltrados = accesos.filter((acc) => {
        const textoBuscar = busqueda.toLowerCase();
        const cumpleBusqueda = 
            acc.nombreCompleto.toLowerCase().includes(textoBuscar) || 
            acc.matricula.toLowerCase().includes(textoBuscar) ||
            (acc.grupoDestino && acc.grupoDestino.toLowerCase().includes(textoBuscar));
        
        const cumpleTipo = filtroTipo === 'TODOS' || acc.tipoUsuario.toUpperCase() === filtroTipo;

        return cumpleBusqueda && cumpleTipo;
    });

    return (
        <div className="main-wrapper">
            <Header titulo="REPORTES DE ASISTENCIA Y ACCESOS" onBack={onBack} />
            
            <div className="content-container animate-fade-in" style={{ padding: '30px' }}>
                
                {/* --- BARRA DE FILTROS --- */}
                <div className="card shadow-sm" style={{ padding: '20px', backgroundColor: '#ffffff', borderRadius: '12px', marginBottom: '20px', display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
                    
                    <div style={{ flex: '1', minWidth: '300px', position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <span className="material-icons" style={{ position: 'absolute', left: '12px', color: '#64748b' }}>search</span>
                        <input 
                            type="text" 
                            placeholder="Buscar por matrícula, nombre o grupo..." 
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            style={{ width: '100%', padding: '10px 12px 10px 40px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none' }}
                        />
                    </div>

                    <select 
                        value={filtroTipo}
                        onChange={(e) => setFiltroTipo(e.target.value)}
                        style={{ padding: '10px 15px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', fontSize: '0.9rem', outline: 'none', cursor: 'pointer' }}
                    >
                        <option value="TODOS">Todos los Usuarios</option>
                        <option value="ALUMNO">Solo Alumnos</option>
                        <option value="MAESTRO">Solo Maestros</option>
                    </select>

                    {/* (El botón de Exportar a Excel lo añadiremos aquí en la Fase 4) */}
                    <button style={{ padding: '10px 20px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', opacity: 0.5 }} title="Próximamente">
                        <span className="material-icons">download</span> Exportar
                    </button>
                </div>

                {/* --- TABLA DE REPORTES --- */}
                <div className="card shadow-md" style={{ padding: '20px', backgroundColor: '#ffffff', borderRadius: '12px' }}>
                    
                    {cargando ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--uat-guinda)' }}>
                            <span className="material-icons rotating" style={{ fontSize: '2.5rem' }}>sync</span>
                        </div>
                    ) : registrosFiltrados.length === 0 ? (
                        <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px' }}>
                            <span className="material-icons" style={{ fontSize: '3rem' }}>folder_off</span>
                            <p>No hay registros de asistencia con estos filtros.</p>
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table className="table-admi" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                <thead>
                                    <tr>
                                        <th>Fecha y Hora</th>
                                        <th>Matrícula / Nombre</th>
                                        <th>Tipo</th>
                                        <th>Destino / Actividad</th>
                                        <th>Estatus</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {registrosFiltrados.map((acc) => {
                                        const { fecha, hora } = formatearFechaHora(acc.fechaHora);
                                        return (
                                            <tr key={acc.idAcceso}>
                                                <td style={{ whiteSpace: 'nowrap' }}>
                                                    <div style={{ fontWeight: 'bold', color: '#334155' }}>{hora}</div>
                                                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{fecha}</div>
                                                </td>
                                                <td>
                                                    <div style={{ fontWeight: 'bold', color: 'var(--uat-guinda)' }}>{acc.matricula}</div>
                                                    <div style={{ color: '#1e293b' }}>{acc.nombreCompleto}</div>
                                                </td>
                                                <td>
                                                    <span style={{ 
                                                        padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold',
                                                        backgroundColor: acc.tipoUsuario.toUpperCase() === 'ALUMNO' ? '#e0f2fe' : '#fef3c7',
                                                        color: acc.tipoUsuario.toUpperCase() === 'ALUMNO' ? '#0369a1' : '#b45309'
                                                    }}>
                                                        {acc.tipoUsuario.toUpperCase()}
                                                    </span>
                                                </td>
                                                <td>
                                                    {acc.materiaDestino ? (
                                                        <>
                                                            <div style={{ fontWeight: '600' }}>{acc.materiaDestino} ({acc.grupoDestino})</div>
                                                            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{acc.aulaDestino} | Docente: {acc.maestroAsignado}</div>
                                                        </>
                                                    ) : (
                                                        <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Sin actividad asignada</span>
                                                    )}
                                                </td>
                                                <td>
                                                    {acc.estatusAcceso === 'PERMITIDO' ? (
                                                        <span style={{ color: '#16a34a', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            <span className="material-icons" style={{ fontSize: '1rem' }}>check_circle</span> OK
                                                        </span>
                                                    ) : (
                                                        <span style={{ color: '#dc2626', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            <span className="material-icons" style={{ fontSize: '1rem' }}>cancel</span> DENEGADO
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};