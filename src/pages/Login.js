// src/pages/Login.js
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const navigate = useNavigate();

  // Se já estiver logado, vai direto pro sistema
  useEffect(() => {
    if (localStorage.getItem("logado") === "true") {
      navigate("/");
    }
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErro("");
    setCarregando(true);

    // Credenciais do admin
    const ADMIN_EMAIL = "financeiro@gmail.com";
    const ADMIN_SENHA = "12345678";

    setTimeout(() => {
      if (email === ADMIN_EMAIL && senha === ADMIN_SENHA) {
        localStorage.setItem("logado", "true");
        localStorage.setItem("usuario", "Administrador Financeiro");
        navigate("/");
      } else {
        setErro("E-mail ou senha incorretos");
        setCarregando(false);
      }
    }, 800);
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
      fontFamily: "'Segoe UI', Roboto, sans-serif"
    }}>
      <div style={{
        background: "rgba(255, 255, 255, 0.95)",
        padding: "50px 40px",
        borderRadius: "20px",
        boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
        width: "100%",
        maxWidth: "420px",
        textAlign: "center",
        backdropFilter: "blur(10px)",
        border: "1px solid rgba(255,255,255,0.3)"
      }}>
        {/* Logo / Título */}
        <div style={{ marginBottom: "30px" }}>
          <h1 style={{
            fontSize: "32px",
            color: "#4a00e0",
            margin: "0 0 10px 0",
            fontWeight: "bold"
          }}>
            Financeiro Rural
          </h1>
          <p style={{ color: "#666", margin: 0 }}>
            Controle total das suas contas do campo
          </p>
        </div>

        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
            required
          />
          
          <input
            type="password"
            placeholder="Senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            style={inputStyle}
            required
          />

          {erro && (
            <div style={{
              background: "#ffebee",
              color: "#c62828",
              padding: "12px",
              borderRadius: "8px",
              margin: "15px 0",
              fontSize: "14px",
              border: "1px solid #ffcdd2"
            }}>
              {erro}
            </div>
          )}

          <button
            type="submit"
            disabled={carregando}
            style={{
              ...buttonStyle,
              opacity: carregando ? 0.8 : 1,
              cursor: carregando ? "not-allowed" : "pointer"
            }}
          >
            {carregando ? "Entrando..." : "Acessar Sistema"}
          </button>
        </form>

        <div style={{
          marginTop: "25px",
          padding: "15px",
          background: "#f5f5f5",
          borderRadius: "10px",
          fontSize: "13px",
          color: "#555"
        }}>
          <strong>Acesso Administrador:</strong><br />
          financeiro@gmail.com<br />
          Senha: 12345678
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "14px 16px",
  margin: "12px 0",
  borderRadius: "12px",
  border: "2px solid #e0e0e0",
  fontSize: "16px",
  transition: "all 0.3s",
  outline: "none"
};

inputStyle[":focus"] = {
  borderColor: "#667eea",
  boxShadow: "0 0 0 3px rgba(102, 126, 234, 0.1)"
};

const buttonStyle = {
  width: "100%",
  padding: "16px",
  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  color: "white",
  border: "none",
  borderRadius: "12px",
  fontSize: "18px",
  fontWeight: "bold",
  cursor: "pointer",
  marginTop: "10px",
  transition: "all 0.3s",
  boxShadow: "0 8px 20px rgba(102, 126, 234, 0.3)"
};

buttonStyle[":hover"] = {
  transform: "translateY(-2px)",
  boxShadow: "0 12px 25px rgba(102, 126, 234, 0.4)"
};