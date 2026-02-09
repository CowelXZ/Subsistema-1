import { useState } from 'react';
import { RegistroUsuario } from './components/RegistroUsuario'; // Asegúrate que el nombre no tenga espacios
import { RegistroEntrada } from './components/RegistroEntrada';

function App() {
  // Estado para controlar qué pantalla vemos: 'entrada' o 'registro'
  const [currentScreen, setCurrentScreen] = useState<'entrada' | 'registro'>('entrada');

  return (
    <div className="App">
      {currentScreen === 'entrada' ? (
        <RegistroEntrada onNavigateToRegister={() => setCurrentScreen('registro')} />
      ) : (
        // Aquí podrías agregar un botón de "Volver" en el RegistroUsuario si quisieras
        <RegistroUsuario />
      )}
    </div>
  );
}

export default App;