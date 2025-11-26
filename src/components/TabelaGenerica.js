// src/components/TabelaGenerica.js   ← ARQUIVO .JS (exatamente como você quer)
import React, { useState, useMemo } from "react";

export default function TabelaGenerica({ colunas, dados, onEditar, onExcluir, loading }) {
  const [ordenacao, setOrdenacao] = useState({ campo: "id", direcao: "asc" });
  const [busca, setBusca] = useState("");

  // Filtra + ordena os dados
  const dadosProcessados = useMemo(() => {
    let filtrados = [...dados];

    // Busca em qualquer coluna
    if (busca.trim()) {
      const termo = busca.toLowerCase();
      filtrados = filtrados.filter(item =>
        colunas.some(col =>
          item[col.campo]?.toString().toLowerCase().includes(termo)
        )
      );
    }

    // Ordenação
    filtrados.sort((a, b) => {
      const A = a[ordenacao.campo] || "";
      const B = b[ordenacao.campo] || "";
      if (ordenacao.direcao === "asc") {
        return A > B ? 1 : -1;
      } else {
        return A < B ? 1 : -1;
      }
    });

    return filtrados;
  }, [dados, busca, ordenacao, colunas]);

  const handleSort = (campo) => {
    setOrdenacao(prev => ({
      campo,
      direcao: prev.campo === campo && prev.direcao === "asc" ? "desc" : "asc"
    }));
  };

  if (loading) {
    return <div style={{ padding: "20px", textAlign: "center" }}>Carregando dados...</div>;
  }

  return (
    <div style={{ marginTop: "20px" }}>
      {/* Campo de busca local */}
      <input
        type="text"
        placeholder="Buscar em qualquer coluna..."
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        style={{
          width: "100%",
          padding: "12px",
          fontSize: "16px",
          borderRadius: "8px",
          border: "1px solid #ccc",
          marginBottom: "15px"
        }}
      />

      {/* Tabela */}
      <div style={{ overflowX: "auto", borderRadius: "8px", boxShadow: "0 2px 10px rgba(0,0,0,0.1)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", background: "white" }}>
          <thead>
            <tr style={{ background: "#667eea", color: "white" }}>
              {colunas.map(col => (
                <th
                  key={col.campo}
                  onClick={() => handleSort(col.campo)}
                  style={{
                    padding: "14px",
                    textAlign: "left",
                    cursor: "pointer",
                    userSelect: "none"
                  }}
                >
                  {col.label}
                  {ordenacao.campo === col.campo && (
                    <span style={{ marginLeft: "8px" }}>
                      {ordenacao.direcao === "asc" ? "↑" : "↓"}
                    </span>
                  )}
                </th>
              ))}
              <th style={{ padding: "14px", textAlign: "center" }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {dadosProcessados.length === 0 ? (
              <tr>
                <td
                  colSpan={colunas.length + 1}
                  style={{ textAlign: "center", padding: "40px", color: "#888" }}
                >
                  Nenhum registro encontrado
                </td>
              </tr>
            ) : (
              dadosProcessados.map(item => (
                <tr key={item.id} style={{ borderBottom: "1px solid #eee" }}>
                  {colunas.map(col => (
                    <td key={col.campo} style={{ padding: "12px" }}>
                      {item[col.campo] || "-"}
                    </td>
                  ))}
                  <td style={{ padding: "12px", textAlign: "center" }}>
                    <button
                      onClick={() => onEditar(item)}
                      style={{
                        marginRight: "8px",
                        padding: "6px 12px",
                        background: "#3498db",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer"
                      }}
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => onExcluir(item.id)}
                      style={{
                        padding: "6px 12px",
                        background: "#e74c3c",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer"
                      }}
                    >
                      Excluir
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}