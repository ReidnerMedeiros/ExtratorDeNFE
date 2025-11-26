import React from "react";
import { Navigate } from "react-router-dom";

export default function PrivateRoute({ children }) {
  const logado = localStorage.getItem("logado") === "true";

  if (!logado) {
    return <Navigate to="/login" />;
  }

  return children;
}