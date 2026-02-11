import { useState } from 'react';
import { RegistroUsuario } from './components/RegistroUsuario';
import { RegistroEntrada } from './components/RegistroEntrada';
import { AsignacionCarga } from './components/Asignacioncargo'; // <--- Importamos la nueva vista

// Definimos los tipos de pantallas posibles
type Screen = 'entrada' | 'registro' | 'carga';

function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('entrada');

  return (
    <div className="App">
      {/* --- PANTALLA 1: ENTRADA --- */}
      {currentScreen === 'entrada' && (
        <RegistroEntrada 
            onNavigateToRegister={() => setCurrentScreen('registro')}
            onNavigateToCarga={() => setCurrentScreen('carga')} // <--- Nueva función
        />
      )}

      {/* --- PANTALLA 2: REGISTRO USUARIO --- */}
      {currentScreen === 'registro' && (
        <RegistroUsuario 
            onBack={() => setCurrentScreen('entrada')} 
        />
      )}

      {/* --- PANTALLA 3: ASIGNACIÓN CARGA (NUEVA) --- */}
      {currentScreen === 'carga' && (
        // Aquí podrías agregar un botón de volver dentro de AsignacionCarga si quisieras
        <div style={{position: 'relative'}}>
            <button 
                onClick={() => setCurrentScreen('entrada')} 
                style={{position: 'absolute', top: 20, left: 20, zIndex: 10}}
            >
                ← Volver
            </button>
            <AsignacionCarga />
        </div>
      )}
    </div>
  );
}

export default App;