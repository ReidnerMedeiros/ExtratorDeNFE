import React, { useState, useEffect } from "react";
import axios from "axios";
import TabelaGenerica from "../components/TabelaGenerica";

export default function ManterContas() {
  const [busca, setBusca] = useState("");
  const [dados, setDados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ id: null, descricao: "" });

  const carregar = async () => {
    setLoading(true);
    const resp = await axios.get("/api/contas?status=ATIVO");
    setDados(resp.data);
    setLoading(false);
  };

  const buscar = async () => {
    if (!busca.trim()) return carregar();
    setLoading(true);
    const resp = await axios.get(`/api/contas/buscar?termo=${busca}`);
    setDados(resp.data);
    setLoading(false);
  };

  const salvar = async () => {
    if (!form.descricao.trim()) return alert("Preencha a descrição");
    if (form.id) {
      await axios.put(`/api/contas/${form.id}`, { descricao: form.descricao.trim() });
    } else {
      await axios.post("/api/contas", { descricao: form.descricao.trim() });
    }
    setForm({ id: null, descricao: "" });
    carregar();
  };

  const excluir = async (id) => {
    if (window.confirm("Tem certeza que deseja inativar esta conta?")) {
      await axios.delete(`/api/contas/${id}`);
      carregar();
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  return (
    <div className="container">
      <h1>Manter Contas</h1>

      <div className="filtros">
        <input
          placeholder="Buscar conta..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && buscar()}
        />
        <button onClick={buscar}>Buscar</button>
        <button onClick={carregar}>Todos</button>
      </div>

      <div className="form-cadastro">
        <h2>{form.id ? "Editar" : "Nova"} Conta</h2>
        <input
          placeholder="Descrição da conta"
          value={form.descricao}
          onChange={(e) => setForm({ ...form, descricao: e.target.value })}
        />
        <div>
          <button onClick={salvar} disabled={!form.descricao.trim()}>
            {form.id ? "Atualizar" : "Criar"}
          </button>
          {form.id && (
            <button onClick={() => setForm({ id: null, descricao: "" })} style={{ marginLeft: 10 }}>
              Cancelar
            </button>
          )}
        </div>
      </div>

      <TabelaGenerica
        colunas={[
          { campo: "id", label: "ID" },
          { campo: "descricao", label: "Descrição" },
        ]}
        dados={dados}
        onEditar={(item) => setForm(item)}
        onExcluir={excluir}
        loading={loading}
      />
    </div>
  );
}