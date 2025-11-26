// src/pages/ManterClassificacao.js
import React, { useState, useEffect } from "react";
import axios from "axios";
import TabelaGenerica from "../components/TabelaGenerica";

export default function ManterClassificacao() {
  const [tipo, setTipo] = useState("DESPESA");
  const [busca, setBusca] = useState("");
  const [dados, setDados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ id: null, descricao: "", tipo: "DESPESA" });

  const carregar = async () => {
    setLoading(true);
    const resp = await axios.get(`/api/classificacao?tipo=${tipo}&status=ATIVO`);
    setDados(resp.data);
    setLoading(false);
  };

  const buscar = async () => {
    if (!busca.trim()) return carregar();
    setLoading(true);
    const resp = await axios.get(`/api/classificacao/buscar?termo=${busca}&tipo=${tipo}`);
    setDados(resp.data);
    setLoading(false);
  };

  const salvar = async () => {
    const payload = { descricao: form.descricao.trim(), tipo };
    if (form.id) {
      await axios.put(`/api/classificacao/${form.id}`, payload);
    } else {
      await axios.post(`/api/classificacao`, payload);
    }
    setForm({ id: null, descricao: "", tipo });
    carregar();
  };

  const excluir = async (id) => {
    if (window.confirm("Tem certeza que deseja inativar esta classificação?")) {
      await axios.delete(`/api/classificacao/${id}`);
      carregar();
    }
  };

  useEffect(() => {
    carregar();
  }, [tipo]);

  return (
    <div className="container">
      <h1>Manter Classificação</h1>

      <div className="filtros">
        <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
          <option value="DESPESA">Despesa</option>
          <option value="RECEITA">Receita</option>
        </select>

        <input
          placeholder="Buscar por descrição..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && buscar()}
        />
        <button onClick={buscar}>Buscar</button>
        <button onClick={carregar}>Todos</button>
      </div>

      <div className="form-cadastro">
        <h2>{form.id ? "Editar" : "Nova"} Classificação - {tipo}</h2>
        <input
          placeholder="Descrição da classificação"
          value={form.descricao}
          onChange={(e) => setForm({ ...form, descricao: e.target.value })}
        />
        <button onClick={salvar} disabled={!form.descricao.trim()}>
          {form.id ? "Atualizar" : "Criar"}
        </button>
        {form.id && <button onClick={() => setForm({ id: null, descricao: "", tipo })}>Cancelar</button>}
      </div>

      <TabelaGenerica
        colunas={[
          { campo: "id", label: "ID" },
          { campo: "descricao", label: "Descrição" },
        ]}
        dados={dados}
        onEditar={(item) => setForm({ ...item })}
        onExcluir={excluir}
        loading={loading}
      />
    </div>
  );
}