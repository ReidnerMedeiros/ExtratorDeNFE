import React, { useState, useEffect } from "react";
import axios from "axios" ;
import TabelaGenerica from "../components/TabelaGenerica";

export default function ManterPessoas() {
  const [tipo, setTipo] = useState("FORNECEDOR");
  const [busca, setBusca] = useState("");
  const [dados, setDados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ id: null, nome: "", documento: "", tipo: "FORNECEDOR" });

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
    if (!form.nome.trim()) return alert("Preencha o nome");
    const payload = { nome: form.nome.trim(), documento: form.documento.trim() };
    if (form.id) {
      await axios.put(`/api/pessoas/${form.id}`, payload);
    } else {
      await axios.post("/api/pessoas", { ...payload, tipo });
    }
    setForm({ id: null, nome: "", documento: "", tipo });
    carregar();
  };

  const excluir = async (id) => {
    if (window.confirm("Tem certeza que deseja inativar esta pessoa?")) {
      await axios.delete(`/api/pessoas/${id}`);
      carregar();
    }
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
          placeholder="Buscar por nome ou documento..."
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
          placeholder="Nome / Razão Social"
          value={form.nome}
          onChange={(e) => setForm({ ...form, nome: e.target.value })}
        />
        <input
          placeholder="CNPJ / CPF (opcional)"
          value={form.documento}
          onChange={(e) => setForm({ ...form, documento: e.target.value })}
        />
        <div>
          <button onClick={salvar} disabled={!form.nome.trim()}>
            {form.id ? "Atualizar" : "Criar"}
          </button>
          {form.id && (
            <button onClick={() => setForm({ id: null, nome: "", documento: "", tipo })} style={{ marginLeft: 10 }}>
              Cancelar
            </button>
          )}
        </div>
      </div>

<TabelaGenerica
  colunas={[
    { campo: "id", label: "ID" },
    { campo: "numeronotafiscal", label: "Nº Nota" },
    { campo: "dataemissao", label: "Emissão", tipo: "data" },
    { campo: "nome_pessoa", label: "Pessoa" },
    { campo: "tipo", label: "Tipo" },
    { campo: "valortotal", label: "Valor", tipo: "moeda" },
    { campo: "status", label: "Status" },
  ]}
  dados={dados}
  onEditar={(item) => abrirEdicao(item)}
  onExcluir={excluir}
  loading={loading}
/>
    </div>
  );
}