import { useState, useEffect, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';

// Definimos la interfaz de tus datos
export interface UserData {
    matricula: string;
    nombres: string;
    apellidoPaterno: string;
    apellidoMaterno: string;
    grado: string;
    grupo: string;
    carrera: string;
    sexo: string;
    observaciones: string;
}

export const useRegistroUsuario = () => {
    // --- ESTADOS ---
    const [listaCarreras, setListaCarreras] = useState<any[]>([]);
    const [formData, setFormData] = useState<UserData>({
        matricula: '', nombres: '', apellidoPaterno: '', apellidoMaterno: '',
        grado: '', grupo: '', carrera: 'Contador Público', sexo: 'M', observaciones: ''
    });
    const [imgSrc, setImgSrc] = useState<string | null>(null);
    const [accessStatus, setAccessStatus] = useState<'permitido' | 'denegado'>('permitido');

    // Modales
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [alertModal, setAlertModal] = useState({
        isOpen: false, title: '', message: '', type: 'success' as 'success' | 'warning' | 'error'
    });

    // Refs
    const webcamRef = useRef<Webcam>(null);

    // --- EFECTOS ---
    useEffect(() => {
        fetch('http://localhost:3000/api/carreras')
            .then(res => res.json())
            .then(data => setListaCarreras(data))
            .catch(err => console.error("Error cargando carreras:", err));
    }, []);

    // --- FUNCIONES AUXILIARES ---
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const showAlert = (title: string, msg: string, type: 'success' | 'warning' | 'error') => {
        setAlertModal({ isOpen: true, title, message: msg, type });
    };

    const closeAlert = () => setAlertModal(prev => ({ ...prev, isOpen: false }));

    const capturarFoto = useCallback(() => {
        if (webcamRef.current) {
            setImgSrc(webcamRef.current.getScreenshot());
        }
    }, [webcamRef]);

    const limpiarFoto = () => setImgSrc(null);

    // --- LÓGICA DE NEGOCIO ---
    const buscarPorMatricula = async () => {
        if (!formData.matricula) return;
        try {
            const res = await fetch(`http://localhost:3000/api/usuarios/${formData.matricula}`);
            if (res.ok) {
                const data = await res.json();
                setFormData({
                    matricula: data.matricula,
                    nombres: data.nombres,
                    apellidoPaterno: data.apellidoPaterno,
                    apellidoMaterno: data.apellidoMaterno || '',
                    grado: '',
                    grupo: '',
                    carrera: data.carrera,
                    sexo: data.sexo,
                    observaciones: data.observaciones || ''
                });
                setImgSrc(data.foto || null);
                showAlert("¡Encontrado!", "Usuario cargado correctamente.", "success");
            } else {
                showAlert("No encontrado", "La matrícula no existe. Puedes registrarlo como nuevo.", "warning");
            }
        } catch (error) {
            console.error(error);
            showAlert("Error", "Error al conectar con el servidor.", "error");
        }
    };

    const guardarEnBaseDeDatos = async () => {
        // Validaciones
        if (!formData.matricula || !formData.nombres) {
            showAlert("Faltan datos", "Por favor llena la matrícula y el nombre", "warning");
            return;
        }

        try {
            const datosParaEnviar = { ...formData, fotoBase64: imgSrc };
            const respuesta = await fetch('http://localhost:3000/api/usuarios/crear', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datosParaEnviar)
            });

            if (respuesta.ok) {
                showAlert("¡Éxito!", "Usuario guardado correctamente.", "success");
                // Limpiar formulario
                setImgSrc(null);
                setFormData({
                    matricula: '', nombres: '', apellidoPaterno: '', apellidoMaterno: '',
                    grado: '', grupo: '', carrera: 'Contador Público', sexo: 'M', observaciones: ''
                });
            } else {
                const errorData = await respuesta.text();
                showAlert("Error al guardar", errorData, "error");
            }
        } catch (error) {
            console.error(error);
            showAlert("Error de Conexión", "No se pudo conectar con el servidor.", "error");
        }
    };

    // Exponemos todo lo necesario
    return {
        // Datos
        formData, listaCarreras, imgSrc, accessStatus,
        // Modales
        showConfirmModal, setShowConfirmModal, alertModal, closeAlert,
        // Referencias
        webcamRef,
        // Acciones
        handleChange, capturarFoto, limpiarFoto, setAccessStatus,
        buscarPorMatricula, guardarEnBaseDeDatos
    };
};