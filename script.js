const entrada = document.getElementById("entrada");
const resultado = document.getElementById("resultado");
const listaFavoritos = document.getElementById("lista-favoritos");
document.getElementById("versao").textContent = APP_VERSION;

const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---------- Lista de países (dataset aberto, sem chave) ----------
const FONTES = [
  "https://cdn.jsdelivr.net/gh/mledoze/countries@master/countries.json",
  "https://raw.githubusercontent.com/mledoze/countries/master/countries.json"
];
let todosPaises = null;

async function carregarPaises() {
  if (todosPaises) return todosPaises;
  for (const url of FONTES) {
    try {
      const resp = await fetch(url);
      if (!resp.ok) continue;
      todosPaises = await resp.json();
      return todosPaises;
    } catch (e) {
      console.error("Falha na fonte", url, e);
    }
  }
  throw new Error("Nenhuma fonte de dados respondeu");
}

const normalizar = s => String(s || "").normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

function nomePt(p) {
  return (p.translations && p.translations.por && p.translations.por.common) || p.name.common;
}
function bandeiraUrl(p) {
  return `https://flagcdn.com/w320/${p.cca2.toLowerCase()}.png`;
}

// ---------- Mostrar um país ----------
function mostrarPais(p) {
  const nome = nomePt(p);
  const capital = (p.capital && p.capital[0]) || "—";
  resultado.innerHTML = `
    <div class="cartao">
      <img src="${bandeiraUrl(p)}" alt="Bandeira">
      <h2></h2>
      <p>Capital: ${capital}</p>
      <p>Região: ${p.region || "—"}</p>
      <p>Área: ${Number(p.area || 0).toLocaleString("pt-BR")} km²</p>
      <button class="btn-favoritar" id="btn-favoritar">✈️ Quero visitar</button>
    </div>`;
  resultado.querySelector("h2").textContent = nome;
  resultado.querySelector("img").alt = "Bandeira de " + nome;
  document.getElementById("btn-favoritar")
    .addEventListener("click", () => salvarFavorito(p.cca3, nome, bandeiraUrl(p)));
}

// ---------- Busca ----------
async function buscarPais(termo) {
  const q = normalizar(termo);
  if (!q) {
    resultado.innerHTML = '<div class="erro">Digite o nome de um país.</div>';
    return;
  }
  resultado.innerHTML = "<p>Buscando...</p>";
  try {
    const lista = await carregarPaises();
    const nomes = p => [p.name.common, p.name.official,
      p.translations && p.translations.por && p.translations.por.common,
      p.translations && p.translations.por && p.translations.por.official]
      .filter(Boolean).map(normalizar);
    const achado = lista.find(p => nomes(p).includes(q))
      || lista.find(p => nomes(p).some(n => n.includes(q)));
    if (!achado) {
      resultado.innerHTML = '<div class="erro">País não encontrado. Confira o nome e tente de novo.</div>';
      return;
    }
    mostrarPais(achado);
  } catch (e) {
    console.error(e);
    resultado.innerHTML = '<div class="erro">Falha ao carregar os países. Verifique sua conexão.</div>';
  }
}

async function paisAleatorio() {
  resultado.innerHTML = "<p>Sorteando...</p>";
  try {
    const lista = await carregarPaises();
    const p = lista[Math.floor(Math.random() * lista.length)];
    entrada.value = nomePt(p);
    mostrarPais(p);
  } catch (e) {
    console.error(e);
    resultado.innerHTML = '<div class="erro">Falha ao carregar os países. Verifique sua conexão.</div>';
  }
}

// ---------- CREATE ----------
async function salvarFavorito(codigo, nome, bandeira) {
  try {
    const { error } = await db.from("favoritos").insert({ codigo, nome, bandeira });
    if (error) {
      console.error(error);
      alert(error.code === "23505"
        ? `${nome} já está na sua lista!`
        : "Não foi possível salvar agora. Tente novamente.");
      return;
    }
    carregarFavoritos();
  } catch (e) {
    console.error(e);
    alert("Sem conexão com o banco. Tente novamente.");
  }
}

// ---------- READ ----------
async function carregarFavoritos() {
  try {
    const { data, error } = await db.from("favoritos")
      .select("*").order("criado_em", { ascending: false });
    if (error) throw error;

    if (data.length === 0) {
      listaFavoritos.innerHTML = "<p>Nenhum país salvo ainda. Busque e salve!</p>";
      return;
    }
    listaFavoritos.innerHTML = "";
    data.forEach(f => {
      const item = document.createElement("div");
      item.className = "fav-item";
      const img = document.createElement("img");
      img.src = f.bandeira || ""; img.alt = "Bandeira de " + f.nome;
      const span = document.createElement("span");
      span.textContent = f.nome;
      const btn = document.createElement("button");
      btn.textContent = "✖"; btn.title = "Remover";
      btn.addEventListener("click", () => removerFavorito(f.codigo));
      item.append(img, span, btn);
      listaFavoritos.appendChild(item);
    });
  } catch (e) {
    console.error(e);
    listaFavoritos.innerHTML = '<div class="erro">Não foi possível carregar a lista.</div>';
  }
}

// ---------- DELETE ----------
async function removerFavorito(codigo) {
  try {
    const { error } = await db.from("favoritos").delete().eq("codigo", codigo);
    if (error) { console.error(error); alert("Não foi possível remover agora."); return; }
    carregarFavoritos();
  } catch (e) {
    alert("Sem conexão com o banco.");
  }
}

// ---------- Eventos ----------
document.getElementById("btn-buscar").addEventListener("click", () => buscarPais(entrada.value));
entrada.addEventListener("keydown", e => { if (e.key === "Enter") buscarPais(entrada.value); });
document.getElementById("btn-aleatorio").addEventListener("click", paisAleatorio);

carregarFavoritos();
