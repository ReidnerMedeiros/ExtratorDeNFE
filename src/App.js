// src/App.js  ← VERSÃO FINAL OFICIAL (substitua o seu atual por este)
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';

// Suas páginas
import ExtrairNota from './pages/ExtrairNota';           // vamos criar esse agora
import ManterClassificacao from './pages/ManterClassificacao';
import ManterContas from './pages/ManterContas';
import ManterPessoas from './pages/ManterPessoas';

import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        {/* Menu de navegação */}
        <nav className="navbar">
          <h2>Sistema de Gestão Financeira com RAG</h2>
          <ul className="nav-links">
            <li><Link to="/">Extrair Nota Fiscal</Link></li>
            <li><Link to="/pessoas">Manter Pessoas</Link></li>
            <li><Link to="/contas">Manter Contas</Link></li>
            <li><Link to="/classificacao">Manter Classificação</Link></li>
          </ul>
        </nav>

        <div className="main-content">
          <Routes>
            <Route path="/" element={<ExtrairNota />} />
            <Route path="/pessoas" element={<ManterPessoas />} />
            <Route path="/contas" element={<ManterContas />} />
            <Route path="/classificacao" element={<ManterClassificacao />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;