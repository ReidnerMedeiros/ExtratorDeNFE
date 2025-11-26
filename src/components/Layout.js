// src/Layout.js
import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import './Layout.css';

export default function Layout() {
  return (
    <div className="layout">
      {/* MENU LATERAL */}
      <aside className="sidebar">
        <h2 className="logo">ERP NFE</h2>
        <nav>
          <ul>
            <li><NavLink to="/" end className={({isActive}) => isActive ? "active" : ""}>Extrair NF-e</NavLink></li>
            <li><NavLink to="/contas" className={({isActive}) => isActive ? "active" : ""}>Contas</NavLink></li>
            <li><NavLink to="/pessoas" className={({isActive}) => isActive ? "active" : ""}>Pessoas</NavLink></li>
            <li><NavLink to="/classificacao" className={({isActive}) => isActive ? "active" : ""}>Classificação</NavLink></li>
          </ul>
        </nav>
      </aside>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="content">
        <Outlet /> {/* Aqui entra a página ativa */}
      </main>
    </div>
  );
}