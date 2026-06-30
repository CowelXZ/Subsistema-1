import React, { useEffect, useState } from 'react';
import { Header } from '../common/Header';
import { Modal } from '../common/Modal'; // Importamos tu Modal

interface BitacoraItem {
    idAcceso: number;
    fechaHora: string;
    ipDireccion: string | null;
    exitoso: number;
    nombre: string;
    apellidoPaterno: string;
    apellidoMaterno: string | null;
    correo: string;
    rol: string;
}

interface Props {
    onBack: () => void;
}

export const BitacoraView: React.FC<Props> = ({ onBack }) => {
    const [logs, setLogs] = useState<BitacoraItem[]>([]);
    const [cargando, setCargando] = useState(true);

    // --- ESTADOS PARA LOS FILTROS ---
    const [busqueda, setBusqueda] = useState('');
    const [filtroRol, setFiltroRol] = useState('TODOS');
    const [filtroEstado, setFiltroEstado] = useState('TODOS');

    // --- ESTADOS PARA EL NUEVO USUARIO ---
    const [modalAbierto, setModalAbierto] = useState(false);
    const [creando, setCreando] = useState(false);
    const [formMensaje, setFormMensaje] = useState<{ texto: string, tipo: 'error' | 'exito' } | null>(null);
    const [formData, setFormData] = useState({
        nombre: '', apellidoPaterno: '', apellidoMaterno: '', correo: '', contrasena: '', rol: 'OPERADOR'
    });

    // --- CARGAR BITÁCORA ---
    useEffect(() => {
        const cargarBitacora = async () => {
            try {
                const response = await fetch('http://localhost:3000/api/auth/bitacora');
                if (response.ok) {
                    const data = await response.json();
                    setLogs(data);
                }
            } catch (error) {
                console.error("Error de red al cargar la bitácora:", error);
            } finally {
                setCargando(false);
            }
        };
        cargarBitacora();
    }, []);

    const formatearFecha = (fechaStr: string) => {
        const fecha = new Date(fechaStr);
        return fecha.toLocaleString('es-MX', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
    };

    // --- FILTROS ---
    const registrosFiltrados = logs.filter((log) => {
        const nombreCompleto = `${log.nombre} ${log.apellidoPaterno} ${log.apellidoMaterno || ''}`.toLowerCase();
        const correo = log.correo.toLowerCase();
        const terminoBusqueda = busqueda.toLowerCase();

        const cumpleBusqueda = nombreCompleto.includes(terminoBusqueda) || correo.includes(terminoBusqueda);
        const cumpleRol = filtroRol === 'TODOS' || log.rol === filtroRol;
        const cumpleEstado = 
            filtroEstado === 'TODOS' || 
            (filtroEstado === 'EXITOSO' && log.exitoso === 1) || 
            (filtroEstado === 'FALLIDO' && log.exitoso === 0);

        return cumpleBusqueda && cumpleRol && cumpleEstado;
    });

    // --- MANEJO DEL FORMULARIO DE USUARIOS ---
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleCrearUsuario = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreando(true);
        setFormMensaje(null);

        try {
            const response = await fetch('http://localhost:3000/api/auth/registrar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await response.json();

            if (response.ok) {
                setFormMensaje({ texto: 'Usuario creado exitosamente. Ya puede iniciar sesión.', tipo: 'exito' });
                // Limpiamos el formulario
                setFormData({ nombre: '', apellidoPaterno: '', apellidoMaterno: '', correo: '', contrasena: '', rol: 'OPERADOR' });
                
                // Cerramos el modal automáticamente después de 2.5 segundos
                setTimeout(() => {
                    setModalAbierto(false);
                    setFormMensaje(null);
                }, 2500);
            } else {
                setFormMensaje({ texto: data.mensaje || 'Error al registrar el usuario.', tipo: 'error' });
            }
        } catch (error) {
            setFormMensaje({ texto: 'Error de red. No se pudo conectar con el servidor.', tipo: 'error' });
        } finally {
            setCreando(false);
        }
    };

    return (
        <div className="main-wrapper" style={{ position: 'relative' }}>
            <Header titulo="BITÁCORA DE AUDITORÍA Y ACCESOS" onBack={onBack} />
            
            <div className="content-container animate-fade-in" style={{ padding: '30px', paddingBottom: '100px' }}>
                
                {/* === BARRA DE FILTROS === */}
                <div className="card shadow-sm" style={{ padding: '20px', backgroundColor: '#ffffff', borderRadius: '12px', marginBottom: '20px', display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ flex: '1', minWidth: '250px', position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <span className="material-icons" style={{ position: 'absolute', left: '12px', color: '#64748b' }}>search</span>
                        <input 
                            type="text" 
                            placeholder="Buscar por nombre, apellidos o correo..." 
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            style={{ width: '100%', padding: '10px 12px 10px 40px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none' }}
                        />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <select value={filtroRol} onChange={(e) => setFiltroRol(e.target.value)} style={{ padding: '10px 15px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', fontSize: '0.9rem', cursor: 'pointer', outline: 'none' }}>
                            <option value="TODOS">Todos los Roles</option>
                            <option value="ADMIN">ADMIN</option>
                            <option value="SUPERVISOR">SUPERVISOR</option>
                            <option value="OPERADOR">OPERADOR</option>
                        </select>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} style={{ padding: '10px 15px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', fontSize: '0.9rem', cursor: 'pointer', outline: 'none' }}>
                            <option value="TODOS">Todos los Estados</option>
                            <option value="EXITOSO">Accesos Exitosos</option>
                            <option value="FALLIDO">Intentos Fallidos</option>
                        </select>
                    </div>
                    <div style={{ marginLeft: 'auto', fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>
                        Mostrando {registrosFiltrados.length} de {logs.length} entradas
                    </div>
                </div>

                {/* === TABLA === */}
                <div className="card shadow-md" style={{ padding: '25px', backgroundColor: '#ffffff', borderRadius: '12px' }}>
                    {cargando ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--uat-guinda)' }}>
                            <span className="material-icons rotating" style={{ fontSize: '2.5rem' }}>sync</span>
                        </div>
                    ) : registrosFiltrados.length === 0 ? (
                        <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px' }}>
                            <span className="material-icons" style={{ fontSize: '3rem', marginBottom: '10px' }}>search_off</span>
                            <p style={{ margin: 0, fontWeight: 500 }}>No se encontraron registros que coincidan con los filtros aplicados.</p>
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table className="table-admi" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr>
                                        <th>Usuario</th>
                                        <th>Correo</th>
                                        <th>Rol</th>
                                        <th>Fecha y Hora</th>
                                        <th>Estado de Entrada</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {registrosFiltrados.map((log) => (
                                        <tr key={log.idAcceso}>
                                            <td style={{ fontWeight: 600, color: '#1e293b' }}>
                                                {`${log.nombre} ${log.apellidoPaterno} ${log.apellidoMaterno || ''}`}
                                            </td>
                                            <td>{log.correo}</td>
                                            <td>
                                                <span className={`badge ${log.rol.toLowerCase()}-badge`} style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                                                    {log.rol}
                                                </span>
                                            </td>
                                            <td style={{ color: '#475569' }}>{formatearFecha(log.fechaHora)}</td>
                                            <td>
                                                {log.exitoso === 1 ? (
                                                    <span style={{ color: '#16a34a', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                        <span className="material-icons" style={{ fontSize: '1.2rem' }}>check_circle</span> Exitoso
                                                    </span>
                                                ) : (
                                                    <span style={{ color: '#dc2626', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                        <span className="material-icons" style={{ fontSize: '1.2rem' }}>cancel</span> Fallido
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* === BOTÓN FLOTANTE (FAB) NARANJA === */}
            <button 
                onClick={() => setModalAbierto(true)}
                title="Registrar Nuevo Usuario del Sistema"
                style={{
                    position: 'fixed',
                    bottom: '40px',
                    right: '40px',
                    backgroundColor: '#f97316', 
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '65px',
                    height: '65px',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    boxShadow: '0 10px 25px rgba(249, 115, 22, 0.4)',
                    cursor: 'pointer',
                    zIndex: 100,
                    transition: 'transform 0.2s, background-color 0.2s'
                }}
                onMouseOver={(e) => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.backgroundColor = '#ea580c'; }}
                onMouseOut={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.backgroundColor = '#f97316'; }}
            >
                <span className="material-icons" style={{ fontSize: '2.5rem' }}>person_add</span>
            </button>

            {/* === MODAL DE REGISTRO DE USUARIOS === */}
            <Modal isOpen={modalAbierto} onClose={() => setModalAbierto(false)} title="NUEVO ACCESO AL SISTEMA">
                <div style={{ padding: '10px' }}>
                    <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '20px' }}>
                        Cree una nueva cuenta y asigne un nivel de jerarquía para autorizar el acceso a la plataforma.
                    </p>

                    {formMensaje && (
                        <div style={{ padding: '12px', marginBottom: '20px', borderRadius: '8px', backgroundColor: formMensaje.tipo === 'error' ? '#fee2e2' : '#dcfce7', color: formMensaje.tipo === 'error' ? '#b91c1c' : '#15803d', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="material-icons">{formMensaje.tipo === 'error' ? 'error_outline' : 'check_circle'}</span>
                            {formMensaje.texto}
                        </div>
                    )}

                    <form onSubmit={handleCrearUsuario} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label style={{ fontWeight: 'bold', fontSize: '0.85rem', color: '#1e293b' }}>Nombre(s) *</label>
                                <input type="text" name="nombre" className="input-field" value={formData.nombre} onChange={handleInputChange} required />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label style={{ fontWeight: 'bold', fontSize: '0.85rem', color: '#1e293b' }}>Apellido Paterno *</label>
                                <input type="text" name="apellidoPaterno" className="input-field" value={formData.apellidoPaterno} onChange={handleInputChange} required />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label style={{ fontWeight: 'bold', fontSize: '0.85rem', color: '#1e293b' }}>Apellido Materno</label>
                                <input type="text" name="apellidoMaterno" className="input-field" value={formData.apellidoMaterno} onChange={handleInputChange} />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label style={{ fontWeight: 'bold', fontSize: '0.85rem', color: '#1e293b' }}>Rol del Sistema *</label>
                                <select name="rol" className="input-field" value={formData.rol} onChange={handleInputChange} style={{ backgroundColor: '#fff', cursor: 'pointer' }}>
                                    <option value="OPERADOR">OPERADOR (Nivel Básico)</option>
                                    <option value="SUPERVISOR">SUPERVISOR (Nivel Medio)</option>
                                    <option value="ADMIN">ADMIN (Acceso Total)</option>
                                </select>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label style={{ fontWeight: 'bold', fontSize: '0.85rem', color: '#1e293b' }}>Correo Electrónico *</label>
                                <input type="email" name="correo" className="input-field" placeholder="ejemplo@uat.edu.mx" value={formData.correo} onChange={handleInputChange} required />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label style={{ fontWeight: 'bold', fontSize: '0.85rem', color: '#1e293b' }}>Contraseña Temporal *</label>
                                <input type="text" name="contrasena" className="input-field" placeholder="Mínimo 6 caracteres" minLength={6} value={formData.contrasena} onChange={handleInputChange} required />
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            className="btn-enter" 
                            style={{ marginTop: '10px', width: '100%', justifyContent: 'center' }} 
                            disabled={creando}
                        >
                            {creando ? (
                                <>CREANDO... <span className="material-icons rotating">sync</span></>
                            ) : (
                                <>GUARDAR USUARIO <span className="material-icons">save</span></>
                            )}
                        </button>
                    </form>
                </div>
            </Modal>
        </div>
    );
};