/* ============ CONFIG ============ */
const API = "/api/comptes";
const PAGES = [
  { href: "index.html", label: "Accueil", id: "accueil" },
  { href: "comptes.html", label: "Comptes", id: "comptes" },
  { href: "operations.html", label: "Opérations", id: "operations" },
  { href: "historique.html", label: "Historique", id: "historique" },
  { href: "apropos.html", label: "Architecture", id: "apropos" },
];

/* ============ HEADER + FOOTER ============ */
function renderLayout() {
  const page = document.body.dataset.page;

  const links = PAGES.map(
    (p) => `<a href="${p.href}" class="${p.id === page ? "active" : ""}">${p.label}</a>`
  ).join("");

  document.getElementById("header").outerHTML = `
    <header class="header">
      <div class="container">
        <a href="index.html" class="logo">
          <div class="logo-icon">🏦</div>
          <div>Nova<span class="accent">Bank</span></div>
        </a>
        <nav class="nav" id="nav">
          ${links}
          <a href="comptes.html?nouveau=1" class="nav-cta">+ Ouvrir un compte</a>
        </nav>
        <button class="burger" id="burger" aria-label="Menu"><span></span><span></span><span></span></button>
      </div>
    </header>`;

  document.getElementById("footer").outerHTML = `
    <footer class="footer">
      <div class="container">
        <div class="footer-grid">
          <div>
            <div class="logo"><div class="logo-icon">🏦</div><div>NovaBank</div></div>
            <p>Application bancaire conteneurisée avec Docker : Flask, MySQL et Nginx.</p>
          </div>
          <div>
            <h4>Navigation</h4>
            <ul>${PAGES.map((p) => `<li><a href="${p.href}">${p.label}</a></li>`).join("")}</ul>
          </div>
          <div>
            <h4>Services</h4>
            <ul>
              <li><a href="comptes.html?nouveau=1">Créer un compte</a></li>
              <li><a href="operations.html">Déposer / Retirer</a></li>
              <li><a href="historique.html">Consulter l'historique</a></li>
            </ul>
          </div>
          <div>
            <h4>Technologies</h4>
            <ul>
              <li><a href="apropos.html">🐳 Docker</a></li>
              <li><a href="apropos.html">🐍 Flask</a></li>
              <li><a href="apropos.html">🐬 MySQL</a></li>
              <li><a href="apropos.html">⚡ Nginx</a></li>
            </ul>
          </div>
        </div>
        <div class="footer-bottom">© ${new Date().getFullYear()} NovaBank — TP2 · 8CLD876 · Conception et architecture des systèmes d'infonuagique</div>
      </div>
    </footer>`;

  // Burger
  const burger = document.getElementById("burger");
  const nav = document.getElementById("nav");
  burger.addEventListener("click", () => {
    burger.classList.toggle("open");
    nav.classList.toggle("open");
  });
  nav.querySelectorAll("a").forEach((a) =>
    a.addEventListener("click", () => {
      burger.classList.remove("open");
      nav.classList.remove("open");
    })
  );
}

/* ============ TOASTS ============ */
function toast(message, type = "info") {
  let box = document.getElementById("toasts");
  if (!box) {
    box = document.createElement("div");
    box.id = "toasts";
    document.body.appendChild(box);
  }
  const t = document.createElement("div");
  t.className = `toast ${type}`;
  t.textContent = message;
  box.appendChild(t);
  setTimeout(() => {
    t.style.transition = ".3s";
    t.style.opacity = "0";
    t.style.transform = "translateX(120%)";
    setTimeout(() => t.remove(), 300);
  }, 3500);
}

/* ============ API ============ */
async function api(url = API, method = "GET", body = null) {
  const options = { method, headers: { "Content-Type": "application/json" } };
  if (body) options.body = JSON.stringify(body);
  try {
    const res = await fetch(url, options);
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data };
  } catch (e) {
    return { ok: false, data: { erreur: "Serveur injoignable" } };
  }
}

/* ============ UTILITAIRES ============ */
const fmt = (n) =>
  new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD" }).format(n);

const fmtDate = (s) =>
  new Date(s.replace(" ", "T")).toLocaleString("fr-CA", {
    dateStyle: "medium",
    timeStyle: "short",
  });

const initiales = (nom) =>
  nom.split(" ").map((m) => m[0]).slice(0, 2).join("").toUpperCase();

// Échappement HTML sans entités écrites en dur (insensible au copier-coller)
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => "&#" + c.charCodeAt(0) + ";");

function openModal(id) { document.getElementById(id).classList.add("open"); }
function closeModal(id) { document.getElementById(id).classList.remove("open"); }

/* Animation d'apparition au scroll */
function initReveal() {
  const obs = new IntersectionObserver(
    (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add("visible")),
    { threshold: 0.12 }
  );
  document.querySelectorAll(".reveal").forEach((el) => obs.observe(el));
}

/* Compteur animé */
function animateCount(el, target, money = false) {
  const duration = 900;
  const start = performance.now();
  function frame(now) {
    const p = Math.min((now - start) / duration, 1);
    const val = target * (1 - Math.pow(1 - p, 3));
    el.textContent = money ? fmt(val) : Math.round(val);
    if (p < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

document.addEventListener("DOMContentLoaded", () => {
  renderLayout();
  initReveal();
});