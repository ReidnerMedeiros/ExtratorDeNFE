// src/App.js ← VERSÃO FINAL OFICIAL (use esta!)
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './Layout';

// Páginas
import ExtrairNota from './pages/ExtrairNota';
import ManterContas from './pages/ManterContas';
import ManterPessoas from './pages/ManterPessoas';
import ManterClassificacao from './pages/ManterClassificacao';

function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<ExtrairNota />} />
          <Route path="/contas" element={<ManterContas />} />
          <Route path="/pessoas" element={<ManterPessoas />} />
          <Route path="/classificacao" element={<ManterClassificacao />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;