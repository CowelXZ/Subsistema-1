import { useState } from 'react';
import { RegistroUsuario } from './components/RegistroUsuario';
import { RegistroEntrada } from './components/RegistroEntrada';
import { AsignacionCarga } from './components/AsignacionCargo';
import { RegistroMaestros } from './components/RegistroMaestros';

type Screen = 'entrada' | 'registro' | 'carga' | 'maestros';

function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('entrada');

  // Función común para volver al inicio
  const goHome = () => setCurrentScreen('entrada');

  return (
    <div className="App">

      {currentScreen === 'entrada' && (
        <RegistroEntrada
          onNavigateToRegister={() => setCurrentScreen('registro')}
          onNavigateToMaestros={() => setCurrentScreen('maestros')}
          onNavigateToCarga={() => setCurrentScreen('carga')}
        />
      )}

      {/* Ahora solo renderizamos el componente directo, pasando la función onBack */}

      {currentScreen === 'registro' && (
        <RegistroUsuario onBack={goHome} />
      )}

      {currentScreen === 'carga' && (
        <AsignacionCarga onBack={goHome} />
      )}

      {currentScreen === 'maestros' && (
        <RegistroMaestros onBack={goHome} />
      )}

    </div>
  );
}

export default App;