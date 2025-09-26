import React from 'react';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { MainContainer } from './components/MainContainer';
import { GlowLines } from './components/ui/GlowLines';
import './styles/animations.css';

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <div className="app">
          <GlowLines />
          <MainContainer />
        </div>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;