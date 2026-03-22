import { useState } from 'react';
import { RegistroUsuario } from './components/RegistroUsuario/RegistroUsuario';
import { RegistroEntrada } from './components/RegistroEntrada';
import { AsignacionCarga } from './components/AsignacionCargo';
import { RegistroMaestros } from './components/RegistroMaestros';
import { AlumnosAdmi } from './components/AlumnosAdmi';

type Screen = 'entrada' | 'registro' | 'carga' | 'maestros' | 'alumnos';

function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('entrada');
  
  // NUEVO: Estado para guardar la matrícula que vamos a editar
  const [matriculaEdit, setMatriculaEdit] = useState<string | null>(null);

  // Función común para volver al inicio
  const goHome = () => {
    setMatriculaEdit(null); // Limpiamos la matrícula al salir
    setCurrentScreen('entrada');
  };

  return (
    <div className="App">

      {currentScreen === 'entrada' && (
        <RegistroEntrada
          onNavigateToRegister={() => { setMatriculaEdit(null); setCurrentScreen('registro'); }}
          onNavigateToMaestros={() => setCurrentScreen('maestros')}
          onNavigateToCarga={() => setCurrentScreen('carga')}
          onNavigateToAlumnos={() => setCurrentScreen('alumnos')}
        />
      )}

      {currentScreen === 'registro' && (
        <RegistroUsuario 
          onBack={goHome} 
          initialMatricula={matriculaEdit} // <-- Le pasamos la matrícula a la pantalla
        />
      )}

      {currentScreen === 'carga' && (
        <AsignacionCarga onBack={goHome} />
      )}

      {currentScreen === 'maestros' && (
        <RegistroMaestros onBack={goHome} />
      )}

      {currentScreen === 'alumnos' && (
        <AlumnosAdmi 
          onBack={goHome} 
          onEditAlumno={(matricula) => {
            // Cuando le den clic a editar, guardamos la matrícula y cambiamos de pantalla
            setMatriculaEdit(matricula);
            setCurrentScreen('registro');
          }}
        />
      )}

    </div>
  );
}

export default App;