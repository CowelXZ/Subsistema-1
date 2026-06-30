import { useState } from 'react';
import { RegistroUsuario } from './components/RegistroUsuario/RegistroUsuario';
import { RegistroEntrada } from './components/RegistroEntrada/RegistroEntrada';
import { AsignacionCarga } from './components/AsignacionCargo/AsignacionCargo';
import { RegistroMaestros } from './components/RegistroMaestros/RegistroMaestros';
import { AlumnosAdmi } from './components/AlumnosAdmi/AlumnosAdmi';
import { InicioSesion } from './components/InicioSesion/InicioSesion';

type Screen = 'entrada' | 'registro' | 'carga' | 'maestros' | 'alumnos' | 'login';

function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('login');
  const [matriculaEdit, setMatriculaEdit] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  const goHome = () => {
    setMatriculaEdit(null); 
    setCurrentScreen('entrada');
  };

  const handleLogout = () => {
    setUserRole(null);
    setCurrentScreen('login');
  };

  return (
    <div className="App">

      {currentScreen === 'login' && (
        <InicioSesion 
           onLoginSuccess={(rol) => {
               setUserRole(rol);
               setCurrentScreen('entrada');
           }} 
        />
      )}

      {currentScreen === 'entrada' && (
        <RegistroEntrada
          userRole={userRole}
          onLogout={handleLogout}
          onNavigateToRegister={() => { setMatriculaEdit(null); setCurrentScreen('registro'); }}
          onNavigateToMaestros={() => setCurrentScreen('maestros')}
          onNavigateToCarga={() => setCurrentScreen('carga')}
          onNavigateToAlumnos={() => setCurrentScreen('alumnos')}
        />
      )}

      {currentScreen === 'registro' && (
        <RegistroUsuario onBack={goHome} initialMatricula={matriculaEdit} />
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
            setMatriculaEdit(matricula);
            setCurrentScreen('registro');
          }}
        />
      )}

    </div>
  );
}

export default App;