// src/pages/ManterPessoas.js
import React, { useState, useEffect } from "react";
import axios from "axios";
import TabelaGenerica from "../components/TabelaGenerica";

export default function ManterPessoas() {
  const [tipo, setTipo] = useState("FORNECEDOR");
  const [busca, setBusca] = useState("");
  const [dados, setDados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    id: null,
    razaosocial: "",
    fantasia: "",
    documento: "",
    tipo: "FORNECEDOR"
  });

  const carregar = async () => {
    setLoading(true);
    const resp = await axios.get(`/api/pessoas?tipo=${tipo}&status=ATIVO`);
    setDados(resp.data);
    setLoading(false);
  };

  const buscar = async () => {
    if (!busca.trim()) return carregar();
    setLoading(true);
    const resp = await axios.get(`/api/pessoas/buscar?termo=${busca}&tipo=${tipo}`);
    setDados(resp.data);
    setLoading(false);
  };

  const salvar = async () => {
    const payload = {
      razaosocial: form.razaosocial.trim(),
      fantasia: form.fantasia.trim(),
      documento: form.documento.replace(/\D/g, ""), // remove pontos, barras, etc.
      tipo: form.tipo
    };

    try {
      if (form.id) {
        await axios.put(`/api/pessoas/${form.id}`, payload);
      } else {
        await axios.post("/api/pessoas", payload);
      }
      limparForm();
      carregar();
    } catch (e) {
      alert("Erro ao salvar: " + (e.response?.data?.error || e.message));
    }
  };

  const editar = (item) => {
    setForm({
      id: item.id,
      razaosocial: item.razaosocial || "",
      fantasia: item.fantasia || "",
      documento: item.documento || "",
      tipo: item.tipo
    });
  };

  const excluir = async (id) => {
    if (window.confirm("Tem certeza que deseja inativar esta pessoa?")) {
      await axios.delete(`/api/pessoas/${id}`);
      carregar();
    }
  };

  const limparForm = () => {
    setForm({
      id: null,
      razaosocial: "",
      fantasia: "",
      documento: "",
      tipo: tipo // mantém o filtro atual
    });
  };

  useEffect(() => {
    carregar();
  }, [tipo]);

  return (
    <div className="container">
      <h1>Manter Pessoas</h1>

      <div className="filtros">
        <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
          <option value="FORNECEDOR">Fornecedor</option>
          <option value="CLIENTE">Cliente</option>
          <option value="FATURADO">Faturado</option>
        </select>

        <input
          placeholder="Buscar por nome ou CNPJ/CPF..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && buscar()}
        />
        <button onClick={buscar}>Buscar</button>
        <button onClick={carregar}>Todos</button>
      </div>

      <div className="form-cadastro">
        <h2>{form.id ? "Editar" : "Nova"} Pessoa - {tipo}</h2>
        <input
          placeholder="Razão Social *"
          value={form.razaosocial}
          onChange={(e) => setForm({ ...form, razaosocial: e.target.value })}
        />
        <input
          placeholder="Nome Fantasia"
          value={form.fantasia}
          onChange={(e) => setForm({ ...form, fantasia: e.target.value })}
        />
        <input
          placeholder="CNPJ ou CPF (apenas números)"
          value={form.documento}
          onChange={(e) => setForm({ ...form, documento: e.target.value.replace(/\D/g, "") })}
        />
        <div className="botoes">
          <button onClick={salvar} disabled={!form.razaosocial.trim()}>
            {form.id ? "Atualizar" : "Criar"}
          </button>
          {form.id && (
            <button onClick={limparForm} className="secundario">
              Cancelar
            </button>
          )}
        </div>
      </div>

      <TabelaGenerica
        colunas={[
          { campo: "id", label: "ID" },
          { campo: "razaosocial", label: "Razão Social" },
          { campo: "fantasia", label: "Nome Fantasia" },
          { campo: "documento", label: "CNPJ/CPF" },
          { campo: "tipo", label: "Tipo" },
        ]}
        dados={dados}
        onEditar={editar}        
        onExcluir={excluir}      
        loading={loading}
      />
    </div>
  );
}