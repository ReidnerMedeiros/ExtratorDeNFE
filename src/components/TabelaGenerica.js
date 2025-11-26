// src/components/TabelaGenerica.js
import React, { useState } from "react";

export default function TabelaGenerica({ colunas, dados, onEditar, onExcluir, loading = false }) {
  const [ordenacao, setOrdenacao] = useState({ coluna: null, direcao: "asc" });

  const ordenar = (coluna) => {
    const direcao = ordenacao.coluna === coluna && ordenacao.direcao === "asc" ? "desc" : "asc";
    setOrdenacao({ coluna, direcao });
  };

  const dadosOrdenados = React.useMemo(() => {
    if (!ordenacao.coluna) return dados;
    return [...dados].sort((a, b) => {
      const x = a[ordenacao.coluna];
      const y = b[ordenacao.coluna];
      if (x === y) return 0;
      if (ordenacao.direcao === "asc") return x > y ? 1 : -1;
      return x < y ? 1 : -1;
    });
  }, [dados, ordenacao]);

  return (
    <div className="tabela-container">
      <table className="tabela">
        <thead>
          <tr>
            {colunas.map((c) => (
              <th key={c.campo} onClick={() => ordenar(c.campo)} style={{ cursor: "pointer" }}>
                {c.label} {ordenacao.coluna === c.campo && (ordenacao.direcao === "asc" ? "↑" : "↓")}
              </th>
            ))}
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={colunas.length + 1} style={{ textAlign: "center" }}>Carregando...</td></tr>
          ) : dadosOrdenados.length === 0 ? (
            <tr><td colSpan={colunas.length + 1} style={{ textAlign: "center", padding: "40px" }}>
              Nenhum registro encontrado
            </td></tr>
          ) : (
            dadosOrdenados.map((item) => (
              <tr key={item.id}>
                {colunas.map((c) => (
                  <td key={c.campo}>{item[c.campo] || "-"}</td>
                ))}
                <td>
                  <button onClick={() => onEditar(item)} className="btn-editar">Editar</button>
                  <button onClick={() => onExcluir(item.id)} className="btn-excluir">Excluir</button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}