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
    // --- MANEJADOR DE CAMBIOS CON FILTROS EN TIEMPO REAL ---
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        let newValue = value;

        // 1. Filtro para Nombres y Apellidos: SOLO LETRAS Y ESPACIOS
        if (name === 'nombres' || name === 'apellidoPaterno' || name === 'apellidoMaterno') {
            // La expresión /[^...]/g busca todo lo que NO sea letra, acento o espacio y lo elimina ('')
            newValue = value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
        }

        // 2. Filtro para Grado (Semestre): SOLO NÚMEROS
        if (name === 'grado') {
            // Elimina cualquier cosa que NO sea un dígito del 0 al 9
            newValue = value.replace(/[^0-9]/g, '');
        }

        // 3. Filtro para Grupo: SOLO UNA LETRA (y la hace mayúscula automáticamente)
        if (name === 'grupo') {
            // Elimina lo que no sea letra, lo pasa a mayúscula y corta si intentas escribir más de 1 caracter
            newValue = value.replace(/[^a-zA-Z]/g, '').toUpperCase().substring(0, 1);
        }

        // Guardamos el valor limpio en el estado
        setFormData(prev => ({ ...prev, [name]: newValue }));
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
                // En tu función buscarPorMatricula:
                const data = await res.json();
                setFormData({
                    matricula: data.matricula,
                    nombres: data.nombres,
                    apellidoPaterno: data.apellidoPaterno,
                    apellidoMaterno: data.apellidoMaterno || '',
                    grado: data.grado || '',
                    grupo: data.grupo || '',
                    carrera: data.carrera || '',
                    sexo: data.sexo,
                    observaciones: data.observaciones || ''
                });
                setImgSrc(data.foto || null);
                if (data.statusAcceso) {
                    setAccessStatus(data.statusAcceso); // <--- Actualiza el Toggle visual
                }

                // ---------------------------------------------------------
                // En tu función guardarEnBaseDeDatos:
                const datosParaEnviar = {
                    ...formData,
                    fotoBase64: imgSrc,
                    statusAcceso: accessStatus // <--- Mandamos el estado verde/rojo al backend
                };
                showAlert("¡Encontrado!", "Usuario cargado correctamente.", "success");
            } else {
                showAlert("No encontrado", "La matrícula no existe. Puedes registrarlo como nuevo.", "warning");
            }
        } catch (error) {
            console.error(error);
            showAlert("Error", "Error al conectar con el servidor.", "error");
        }
    };


    // --- VALIDACIONES ---
    const validarDatos = (): boolean => {
        const { matricula, nombres, apellidoPaterno, grado, grupo, carrera } = formData;

        if (!matricula.trim()) {
            showAlert("Campo Obligatorio", "La matrícula no puede estar vacía.", "warning");
            return false;
        }

        // Regex para aceptar solo letras, acentos, ñ y espacios
        const regexLetras = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;

        if (!nombres.trim() || !regexLetras.test(nombres)) {
            showAlert("Nombre Inválido", "El nombre es obligatorio y solo debe contener letras.", "warning");
            return false;
        }

        if (!apellidoPaterno.trim() || !regexLetras.test(apellidoPaterno)) {
            showAlert("Apellido Inválido", "El apellido paterno es obligatorio y solo debe contener letras.", "warning");
            return false;
        }

        const gradoNum = parseInt(grado);
        if (!grado.trim() || isNaN(gradoNum) || gradoNum < 1 || gradoNum > 10) {
            showAlert("Grado Inválido", "El grado (semestre) debe ser un número válido (ej. 1 al 10).", "warning");
            return false;
        }

        // Regex para aceptar exactamente una letra (A-Z)
        const regexGrupo = /^[a-zA-Z]$/;
        if (!grupo.trim() || !regexGrupo.test(grupo)) {
            showAlert("Grupo Inválido", "El grupo debe ser una sola letra (ej. A, B, K).", "warning");
            return false;
        }

        if (!carrera) {
            showAlert("Carrera Inválida", "Debes seleccionar una carrera de la lista.", "warning");
            return false;
        }

        if (!imgSrc) {
            showAlert("Falta Fotografía", "Es necesario capturar la foto del usuario para el control de acceso.", "warning");
            return false;
        }

        return true; // Si sobrevive a todo esto, está perfecto
    };

    // Función puente: Solo abre el modal si las validaciones pasan
    const intentarGuardar = () => {
        if (validarDatos()) {
            setShowConfirmModal(true);
        }
    };

    const guardarEnBaseDeDatos = async () => {
        // (Ya no necesitamos el IF de validación aquí porque 'intentarGuardar' ya lo hizo)
        try {
            const datosParaEnviar = {
                ...formData,
                fotoBase64: imgSrc,
                statusAcceso: accessStatus
            };
            // ... (EL RESTO DE TU FETCH SE QUEDA EXACTAMENTE IGUAL) ...
            const respuesta = await fetch('http://localhost:3000/api/usuarios/crear', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datosParaEnviar)
            });

            if (respuesta.ok) {
                showAlert("¡Éxito!", "Usuario guardado correctamente.", "success");
                setImgSrc(null);
                setFormData({
                    matricula: '', nombres: '', apellidoPaterno: '', apellidoMaterno: '',
                    grado: '', grupo: '', carrera: '', sexo: 'M', observaciones: ''
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

    // Asegúrate de exportar intentarGuardar al final
    return {
        formData, listaCarreras, imgSrc, accessStatus,
        showConfirmModal, setShowConfirmModal, alertModal, closeAlert,
        webcamRef,
        handleChange, capturarFoto, limpiarFoto, setAccessStatus,
        buscarPorMatricula, guardarEnBaseDeDatos, intentarGuardar // <--- NUEVO
    };
};
