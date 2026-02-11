import { useState } from 'react';
import { RegistroUsuario } from './components/RegistroUsuario';
import { RegistroEntrada } from './components/RegistroEntrada';
import { AsignacionCarga } from './components/AsignacionCargo';
import { RegistroMaestros } from './components/RegistroMaestros'; // <--- Importar

// Agregamos 'maestros' al tipo
type Screen = 'entrada' | 'registro' | 'carga' | 'maestros';

function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('entrada');

  return (
    <div className="App">
      {/* --- PANTALLA 1: ENTRADA --- */}
      {currentScreen === 'entrada' && (
        <RegistroEntrada 
            onNavigateToRegister={() => setCurrentScreen('registro')}
            onNavigateToCarga={() => setCurrentScreen('carga')}
            onNavigateToMaestros={() => setCurrentScreen('maestros')} // <--- Nueva Prop
        />
      )}

      {/* --- PANTALLA 2: REGISTRO ALUMNO --- */}
      {currentScreen === 'registro' && (
        <RegistroUsuario onBack={() => setCurrentScreen('entrada')} />
      )}

      {/* --- PANTALLA 3: CARGA ACADÉMICA --- */}
      {currentScreen === 'carga' && (
         <div style={{position: 'relative'}}>
            <button onClick={() => setCurrentScreen('entrada')} style={{position: 'absolute', top: 20, left: 20, zIndex: 10}}>← Volver</button>
            <AsignacionCarga />
        </div>
      )}

      {/* --- PANTALLA 4: REGISTRO MAESTROS (NUEVA) --- */}
      {currentScreen === 'maestros' && (
         <div style={{position: 'relative'}}>
            {/* Botón temporal de volver, idealmente integrar en el Header del componente */}
            <button onClick={() => setCurrentScreen('entrada')} style={{position: 'absolute', top: 20, left: 20, zIndex: 10}}>← Volver</button>
            <RegistroMaestros />
        </div>
      )}
    </div>
  );
}

export default App;