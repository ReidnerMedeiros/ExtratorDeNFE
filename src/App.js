// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';

// Páginas públicas
import Login from './pages/Login';

// Páginas protegidas
import ExtrairNota from './pages/ExtrairNota';
import ManterContas from './pages/ManterContas';
import ManterPessoas from './pages/ManterPessoas';
import ManterClassificacao from './pages/ManterClassificacao';

// Componente de rota protegida
const PrivateRoute = ({ children }) => {
  const isLoggedIn = localStorage.getItem('logado') === 'true';
  return isLoggedIn ? children : <Navigate to="/login" replace />;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* TELA DE LOGIN */}
        <Route path="/login" element={<Login />} />

        {/* ROTAS PROTEGIDAS COM LAYOUT */}
        <Route
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route path="/" element={<ExtrairNota />} />
          <Route path="/contas" element={<ManterContas />} />
          <Route path="/pessoas" element={<ManterPessoas />} />
          <Route path="/classificacao" element={<ManterClassificacao />} />
        </Route>

        {/* Redireciona qualquer rota desconhecida pro login ou home */}
        <Route path="*" element={<Navigate to={localStorage.getItem('logado') ? '/' : '/login'} />} />
      </Routes>
    </Router>
  );
}

export default App;