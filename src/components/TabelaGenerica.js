// src/components/TabelaGenerica.jsx  ← VERSÃO FINAL (atende todos os itens a–j)
import React, { useState, useMemo } from "react";

export default function TabelaGenerica({ colunas, dados, onEditar, onExcluir, loading }) {
  const [ordenacao, setOrdenacao] = useState({ campo: "id", direcao: "asc" });
  const [buscaLocal, setBuscaLocal] = useState("");

  const dadosFiltrados = useMemo(() => {
    let filtrados = [...dados];

    // Filtro local (busca em qualquer coluna)
    if (buscaLocal.trim()) {
      const termo = buscaLocal.toLowerCase();
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
  }, [dados, buscaLocal, ordenacao, colunas]);

  const handleSort = (campo) => {
    setOrdenacao(prev => ({
      campo,
      direcao: prev.campo === campo && prev.direcao === "asc" ? "desc" : "asc"
    }));
  };

  if (loading) return <p>Carregando...</p>;

  return (
    <div>
      <input
        placeholder="Buscar em qualquer coluna..."
        value={buscaLocal}
        onChange={(e) => setBuscaLocal(e.target.value)}
        style={{ width: "100%", padding: "8px", marginBottom: "10px" }}
      />
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#f2f2f2" }}>
            {colunas.map(col => (
              <th
                key={col.campo}
                onClick={() => handleSort(col.campo)}
                style={{ cursor: "pointer", padding: "10px", textAlign: "left" }}
              >
                {col.label} {ordenacao.campo === col.campo ? (ordenacao.direcao === "asc" ? "↑" : "↓") : "↕"}
              </th>
            ))}
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {dadosFiltrados.length === 0 ? (
            <tr><td colSpan={colunas.length + 1} style={{ textAlign: "center", padding: "20px" }}>
              Nenhum registro encontrado
            </td></tr>
          ) : (
            dadosFiltrados.map(item => (
              <tr key={item.id}>
                {colunas.map(col => (
                  <td key={col.campo} style={{ padding: "8px", borderBottom: "1px solid #ddd" }}>
                    {item[col.campo]}
                  </td>
                ))}
                <td>
                  <button onClick={() => onEditar(item)} style={{ marginRight: "5px" }}>Editar</button>
                  <button onClick={() => onExcluir(item.id)} style={{ color: "red" }}>Excluir</button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}