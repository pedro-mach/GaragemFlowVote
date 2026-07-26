const sharp = require("sharp");
const https = require("https");
const fs = require("fs");
const path = require("path");

// Parse .env
const envContent = fs.readFileSync(path.join(__dirname, "..", ".env"), "utf8");
const envVars = {};
envContent.split("\n").forEach((line) => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || "";
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    envVars[match[1]] = value.trim();
  }
});

const SUPABASE_URL = envVars["VITE_SUPABASE_URL"];
const SUPABASE_KEY = envVars["VITE_SUPABASE_ANON_KEY"];
const domain = SUPABASE_URL.replace("https://", "").replace("/", "");

function supabaseRequest(path, method = "GET", bodyData = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: domain,
      port: 443,
      path: "/rest/v1" + path,
      method: method,
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": "Bearer " + SUPABASE_KEY,
        "Content-Type": "application/json",
        "Prefer": "return=representation"
      }
    };

    const req = https.request(options, (res) => {
      let chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        const bodyStr = Buffer.concat(chunks).toString("utf8");
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(bodyStr));
          } catch (e) {
            resolve(bodyStr);
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${bodyStr}`));
        }
      });
    });

    req.on("error", (err) => reject(err));
    if (bodyData) req.write(JSON.stringify(bodyData));
    req.end();
  });
}

async function compressBase64Photo(base64String) {
  const matches = base64String.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
  const rawBase64 = matches ? matches[2] : base64String;
  const inputBuffer = Buffer.from(rawBase64, "base64");
  const outputBuffer = await sharp(inputBuffer)
    .resize(800, 800, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 75 })
    .toBuffer();
  return "data:image/webp;base64," + outputBuffer.toString("base64");
}

async function main() {
  console.log("?? Buscando lista de carros (id, numero_inscricao, modelo)...");
  const carros = await supabaseRequest("/carros?select=id,numero_inscricao,modelo");
  console.log(`?? Encontrados ${carros.length} carros no banco de dados.\n`);

  let sucesso = 0;
  let ignorados = 0;
  let semFoto = 0;
  let falha = 0;

  for (let i = 0; i < carros.length; i++) {
    const c = carros[i];
    
    try {
      const detailArr = await supabaseRequest(`/carros?select=url_foto&id=eq.${c.id}`);
      const detail = detailArr[0];

      if (!detail || !detail.url_foto || detail.url_foto.trim() === "") {
        semFoto++;
        continue;
      }

      const tamanhoOriginalKB = Math.round(Buffer.byteLength(detail.url_foto, "utf8") / 1024);

      if (tamanhoOriginalKB <= 200) {
        console.log(`[${i + 1}/${carros.length}] #${c.numero_inscricao || 'N/A'} - ${c.modelo}: ? Já otimizada (${tamanhoOriginalKB} KB)`);
        ignorados++;
        continue;
      }

      console.log(`[${i + 1}/${carros.length}] #${c.numero_inscricao || 'N/A'} - ${c.modelo} (${tamanhoOriginalKB} KB) ? Recompactando...`);

      const novaFoto = await compressBase64Photo(detail.url_foto);
      const novoTamanhoKB = Math.round(Buffer.byteLength(novaFoto, "utf8") / 1024);

      await supabaseRequest(`/carros?id=eq.${c.id}`, "PATCH", { url_foto: novaFoto });
      
      const reducao = Math.round((1 - novoTamanhoKB / tamanhoOriginalKB) * 100);
      console.log(`   ? Otimizada para ${novoTamanhoKB} KB (redução de ${reducao}%)`);
      sucesso++;
    } catch (err) {
      console.log(`   ? Erro no carro #${c.numero_inscricao || 'N/A'}: ${err.message}`);
      falha++;
    }
  }

  console.log("\n----------------------------------------------");
  console.log(`? Recompactadas com sucesso: ${sucesso}`);
  console.log(`? Já otimizadas (< 200 KB): ${ignorados}`);
  console.log(`?? Sem foto cadastrada: ${semFoto}`);
  if (falha > 0) console.log(`? Falhas: ${falha}`);
  console.log("----------------------------------------------");
  console.log("?? Processo de recompactação finalizado com sucesso!");
}

main().catch((err) => {
  console.error("?? Erro fatal:", err);
  process.exit(1);
});
