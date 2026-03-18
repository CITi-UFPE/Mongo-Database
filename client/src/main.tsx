import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
// 1. IMPORTA O CHATBOT AQUI
import { Chatbot } from "@/components/Chatbot/Chatbot";



const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element not found");
}
// 2. DESENHA A TELA APENAS UMA VEZ COM O APP E O CHATBOT JUNTOS
createRoot(root).render(
  <React.StrictMode>
    <App />
    <Chatbot />
  </React.StrictMode>
);
