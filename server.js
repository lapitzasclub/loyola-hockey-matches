// server.js
// Servidor Express que sirve archivos estáticos y proxy en /api/*

const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const path = require("path");

const app = express();
const PORT = 8080;

// Proxy para /api/*
app.use(
  "/api",
  createProxyMiddleware({
    target: "https://fvpatinaje.eus/webservices/WSCompeticiones.asmx",
    changeOrigin: true,
    pathRewrite: {
      "^/api": "", // Elimina /api del path
    },
    secure: true,
    logLevel: "debug",
  })
);

// Servir archivos estáticos de www
app.use(express.static(path.join(__dirname, "www")));

app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});

// Para usar:
// 1. Instala dependencias: npm install express http-proxy-middleware
// 2. Arranca: node server.js
// 3. Accede a http://localhost:8080
