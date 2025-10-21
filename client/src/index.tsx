import React from "react";
import ReactDOM from "react-dom/client";
// @ts-ignore: implicit any from JS module without declaration file
import App from "./App";
import "./index.css"; // se estiver usando Tailwind ou CSS global

const root = ReactDOM.createRoot(document.getElementById("root")!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
