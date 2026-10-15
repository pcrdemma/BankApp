/* ============ CONFIG ============ */
// URL de base de mon API Flask : toutes les requêtes pour les comptes passent par ici
// (Nginx redirige /api vers le conteneur Flask)
const API = "/api/comptes";

// Liste de toutes les pages du site. Je la définis une seule fois ici et je m'en sers
// pour générer le menu du header ET la navigation du footer (pas de duplication de code).
// Le "id" correspond à l'attribut data-page du <body> de chaque page HTML
const PAGES = [
  { href: "index.html", label: "Accueil", id: "accueil" },
  { href: "comptes.html", label: "Comptes", id: "comptes" },
  { href: "operations.html", label: "Opérations", id: "operations" },
  { href: "historique.html", label: "Historique", id: "historique" },
  { href: "apropos.html", label: "Architecture", id: "apropos" },
];

/* ============ HEADER + FOOTER ============ */
// Cette fonction construit le header et le footer en JavaScript.
// Ça me permet de les écrire une seule fois au lieu de les copier dans les 5 pages HTML
function renderLayout() {
  // Je récupère le nom de la page courante depuis l'attribut data-page du <body>
  // (ex: <body data-page="comptes"> donne "comptes")
  const page = document.body.dataset.page;

  // Je transforme le tableau PAGES en liens HTML avec map().
  // Le lien de la page actuelle reçoit la classe "active" pour être mis en évidence dans le menu.
  // join("") colle tous les liens ensemble en une seule chaîne de texte
  const links = PAGES.map(
    (p) => `<a href="${p.href}" class="${p.id === page ? "active" : ""}">${p.label}</a>`
  ).join("");

  // Je remplace la balise #header de la page par le vrai header complet.
  // Il contient le logo, le menu de navigation, le bouton "Ouvrir un compte"
  // et le bouton burger (visible seulement sur mobile)
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

  // Pareil pour le footer : je remplace la balise #footer par le footer complet.
  // Il est organisé en 4 colonnes : présentation, navigation, services et technologies
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

  // ----- Menu burger (version mobile) -----
  const burger = document.getElementById("burger");
  const nav = document.getElementById("nav");

  // Quand je clique sur le burger, j'ajoute/retire la classe "open"
  // sur le bouton (animation en croix) et sur le menu (pour l'afficher ou le cacher)
  burger.addEventListener("click", () => {
    burger.classList.toggle("open");
    nav.classList.toggle("open");
  });

  // Quand je clique sur un lien du menu, je referme automatiquement le menu mobile
  nav.querySelectorAll("a").forEach((a) =>
    a.addEventListener("click", () => {
      burger.classList.remove("open");
      nav.classList.remove("open");
    })
  );
}

/* ============ TOASTS ============ */
// Les toasts sont les petites notifications qui apparaissent en coin d'écran
// (ex: "Compte créé", "Solde insuffisant"). Le type peut être "info", "success" ou "error"
function toast(message, type = "info") {
  // Je cherche le conteneur des toasts. S'il n'existe pas encore, je le crée
  // et je l'ajoute à la page (ça n'arrive qu'à la toute première notification)
  let box = document.getElementById("toasts");
  if (!box) {
    box = document.createElement("div");
    box.id = "toasts";
    document.body.appendChild(box);
  }

  // Je crée le toast lui-même avec sa classe CSS selon le type, puis j'y mets le message.
  // J'utilise textContent (et pas innerHTML) pour éviter toute injection de code
  const t = document.createElement("div");
  t.className = `toast ${type}`;
  t.textContent = message;
  box.appendChild(t);

  // Après 3,5 secondes, je fais disparaître le toast avec une animation
  // (il devient transparent et glisse vers la droite), puis je le supprime
  // du DOM 300 ms plus tard, une fois l'animation terminée
  setTimeout(() => {
    t.style.transition = ".3s";
    t.style.opacity = "0";
    t.style.transform = "translateX(120%)";
    setTimeout(() => t.remove(), 300);
  }, 3500);
}

/* ============ API ============ */
// Fonction générique pour appeler mon API Flask.
// Les paramètres ont des valeurs par défaut : sans rien préciser, elle fait un GET sur /api/comptes.
// Je l'utilise partout dans le site, donc je n'écris le fetch qu'une seule fois
async function api(url = API, method = "GET", body = null) {
  // Je prépare les options de la requête : la méthode HTTP et l'en-tête JSON
  const options = { method, headers: { "Content-Type": "application/json" } };

  // S'il y a des données à envoyer (création de compte, dépôt...), je les convertis en JSON
  if (body) options.body = JSON.stringify(body);

  try {
    // J'envoie la requête au serveur et j'attends la réponse
    const res = await fetch(url, options);

    // Je lis la réponse en JSON. Si la réponse n'est pas du JSON valide,
    // le catch retourne un objet vide {} pour que le code ne plante pas
    const data = await res.json().catch(() => ({}));

    // Je retourne toujours le même format : { ok: true/false, data: ... }
    // pour que les autres fichiers sachent facilement si ça a marché
    return { ok: res.ok, data };
  } catch (e) {
    // Si le serveur est éteint ou injoignable, je retourne une erreur propre
    return { ok: false, data: { erreur: "Serveur injoignable" } };
  }
}

/* ============ UTILITAIRES ============ */
// Formate un nombre en montant d'argent canadien (ex: 1500 devient "1 500,00 $")
const fmt = (n) =>
  new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD" }).format(n);

// Formate une date venant de MySQL en date lisible en français (ex: "15 oct. 2026, 14 h 33").
// Je remplace l'espace par un "T" pour obtenir le format ISO que JavaScript comprend bien
const fmtDate = (s) =>
  new Date(s.replace(" ", "T")).toLocaleString("fr-CA", {
    dateStyle: "medium",
    timeStyle: "short",
  });

// Récupère les initiales d'un nom pour l'avatar (ex: "Emma Dupont" devient "ED").
// Je découpe en mots, je prends la 1re lettre de chacun, je garde les 2 premières en majuscules
const initiales = (nom) =>
  nom.split(" ").map((m) => m[0]).slice(0, 2).join("").toUpperCase();

// Échappement HTML sans entités écrites en dur (insensible au copier-coller)
// Cette fonction sécurise les textes saisis par l'utilisateur avant de les afficher
// dans le HTML : elle remplace les caractères dangereux (& < > " ') par leur code HTML.
// Ça protège contre les failles XSS (injection de code malveillant)
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => "&#" + c.charCodeAt(0) + ";");

// Ouvre une fenêtre modale en lui ajoutant la classe CSS "open"
function openModal(id) { document.getElementById(id).classList.add("open"); }
// Ferme une fenêtre modale en retirant la classe "open"
function closeModal(id) { document.getElementById(id).classList.remove("open"); }

/* Animation d'apparition au scroll */
// Les éléments avec la classe "reveal" apparaissent progressivement quand on scrolle jusqu'à eux
function initReveal() {
  // L'IntersectionObserver surveille quand un élément devient visible à l'écran.
  // Quand c'est le cas (isIntersecting), j'ajoute la classe "visible" qui déclenche l'animation CSS.
  // Le seuil de 0.12 signifie que l'animation démarre quand 12 % de l'élément est visible
  const obs = new IntersectionObserver(
    (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add("visible")),
    { threshold: 0.12 }
  );
  // Je demande à l'observateur de surveiller tous les éléments ".reveal" de la page
  document.querySelectorAll(".reveal").forEach((el) => obs.observe(el));
}

/* Compteur animé */
// Fait défiler un nombre de 0 jusqu'à sa valeur finale (utilisé pour les statistiques de l'accueil).
// Si money vaut true, le nombre est affiché comme un montant en dollars
function animateCount(el, target, money = false) {
  // L'animation dure 900 ms et je note l'instant de départ
  const duration = 900;
  const start = performance.now();

  // Cette fonction est appelée à chaque image de l'animation
  function frame(now) {
    // p = progression de l'animation entre 0 (début) et 1 (fin)
    const p = Math.min((now - start) / duration, 1);
    // J'applique un effet "ease-out" : le compteur démarre vite puis ralentit à la fin
    const val = target * (1 - Math.pow(1 - p, 3));
    // J'affiche la valeur : formatée en argent ou arrondie en nombre entier
    el.textContent = money ? fmt(val) : Math.round(val);
    // Tant que l'animation n'est pas terminée, je programme l'image suivante
    if (p < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// Quand la page HTML est entièrement chargée, je génère le header/footer
// et j'active les animations au scroll. C'est le point d'entrée de ce fichier
document.addEventListener("DOMContentLoaded", () => {
  renderLayout();
  initReveal();
});