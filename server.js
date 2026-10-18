const http = require("http");
const fs = require("fs");
const path = require("path");

const HOST = "127.0.0.1";
const PORT = 3010;
const ASSETS = path.join(__dirname, "assets");

// BABAYAGA é separado do AZYRA.
// A API aceita SOMENTE SVG nesta base.
const IDS = {
  "1000": "background",
  "1001": "logo",

  "1101": "card_geral",
  "1102": "card_movimentacao",
  "1103": "card_outros",

  "1201": "lista_veiculos",
  "1202": "lista_jogadores",

  "1301": "selection_sidebar",
  "1311": "sidebar_jogador",
  "1312": "sidebar_visual",
  "1313": "sidebar_troll",
  "1314": "sidebar_dinheiro",
  "1315": "sidebar_exploits",
  "1316": "sidebar_privates",
  "1317": "sidebar_config",

  "1401": "tab_jogador",
  "1402": "tab_veiculo",
  "1403": "tab_arma",
  "1404": "tab_posicoes",
  "1405": "tab_roupas",

  "1501": "forma do toggle off",
  "1502": "forma do toggle on",
  "1503": "bolinha do toglle",
  "1504": "scroll",

  "1601": "box_arma_geral",
  "1602": "box_arma_outros",
  "1610": "tab_indicator",

  "1701": "box vazia2",
  "1702": "box vazia4",
  "1703": "box vazia3",
  "1710": "icon_arma",
  "1711": "dropdown_bg",
  "1712": "dialog_spawn",
  "1720": "Keyboard",
  "1721": "Settings",

  "1801": "cursor"
};

function assetFile(id) {
  const base = IDS[id];
  if (!base) return null;

  const file = path.join(ASSETS, base + ".svg");
  return fs.existsSync(file) ? file : null;
}

function noCacheHeaders(type) {
  return {
    "Content-Type": type,
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    "Pragma": "no-cache"
  };
}

function sendSvg(res, file) {
  res.writeHead(200, noCacheHeaders("image/svg+xml; charset=utf-8"));
  fs.createReadStream(file).pipe(res);
}

function sendRenderPage(res, id) {
  const file = assetFile(id);

  if (!file) {
    res.writeHead(404, {"Content-Type": "text/plain; charset=utf-8"});
    return res.end("SVG nao encontrado para ID " + id);
  }

  // IMPORTANTE:
  // /render/ NÃO converte o arquivo para PNG.
  // O arquivo no disco continua .svg.
  // A página apenas faz o Chromium rasterizar o vetor no tamanho
  // da DUI pedido pelo Lua (2x/4x), como na estrutura usada no AZYRA.
  const assetUrl = "/api/babayaga/" + id;

  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
html,body{
  margin:0;
  padding:0;
  width:100%;
  height:100%;
  overflow:hidden;
  background:transparent;
}
img{
  display:block;
  width:100vw;
  height:100vh;
  object-fit:fill;
  image-rendering:auto;
  border:0;
  outline:0;
}
</style>
</head>
<body><img src="${assetUrl}" draggable="false"></body>
</html>`;

  res.writeHead(200, noCacheHeaders("text/html; charset=utf-8"));
  res.end(html);
}

const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent((req.url || "/").split("?")[0]);

  if (pathname === "/" || pathname === "/health") {
    res.writeHead(200, noCacheHeaders("text/plain; charset=utf-8"));
    return res.end("BABAYAGA LOCAL API OK");
  }

  const render = pathname.match(/^\/render\/(\d+)$/);
  if (render) {
    return sendRenderPage(res, render[1]);
  }

  const api = pathname.match(/^\/api\/babayaga\/(\d+)$/);
  if (!api) {
    res.writeHead(404, {"Content-Type": "text/plain; charset=utf-8"});
    return res.end("Rota nao encontrada");
  }

  const file = assetFile(api[1]);
  if (!file) {
    res.writeHead(404, {"Content-Type": "text/plain; charset=utf-8"});
    return res.end("SVG nao encontrado para ID " + api[1]);
  }

  sendSvg(res, file);
});

server.listen(PORT, HOST, () => {
  console.log("");
  console.log("==============================================");
  console.log(" BABAYAGA LOCAL API - SVG ONLY");
  console.log(" http://" + HOST + ":" + PORT);
  console.log("==============================================");
  console.log("");
  console.log("Teste:");
  console.log(" http://" + HOST + ":" + PORT + "/health");
  console.log(" http://" + HOST + ":" + PORT + "/api/babayaga/1000");
  console.log("");
  console.log("Nenhum PNG e usado pela API.");
  console.log("");
});

// porta ocupada: se for outra BABAYAGA API, ok; se for outro programa, avisa
server.on("error", (err) => {
  if (err && err.code === "EADDRINUSE") {
    const req = http.get("http://" + HOST + ":" + PORT + "/health", (res) => {
      let body = "";
      res.on("data", (c) => (body += c));
      res.on("end", () => {
        if (body.indexOf("BABAYAGA LOCAL API OK") !== -1) {
          console.log("");
          console.log("==============================================");
          console.log(" A BABAYAGA API ja esta rodando nesta porta.");
          console.log(" Nada a fazer — pode fechar esta janela.");
          console.log("==============================================");
          console.log("");
          process.exit(0);
        } else {
          console.log("");
          console.log("[ERRO] A porta " + PORT + " esta ocupada por OUTRO programa.");
          console.log("        Feche ele ou mude a PORT no server.js.");
          console.log("");
          process.exit(1);
        }
      });
    });
    req.on("error", () => {
      console.log("");
      console.log("[ERRO] A porta " + PORT + " esta ocupada e nao respondeu ao /health.");
      console.log("");
      process.exit(1);
    });
    return;
  }

  console.log("");
  console.log("[ERRO] Falha no servidor: " + (err && err.message ? err.message : String(err)));
  console.log("");
  process.exit(1);
});
