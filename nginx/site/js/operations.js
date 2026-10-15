// Tableau qui contient tous les comptes récupérés depuis l'API.
// Je le garde en mémoire pour retrouver le solde du compte sélectionné sans refaire de requête
let comptes = [];

// Type d'opération actuellement choisi : "depot" ou "retrait".
// Par défaut on commence sur le dépôt. Cette valeur sert aussi à construire l'URL de l'API
// (/api/comptes/<id>/depot ou /api/comptes/<id>/retrait)
let type = "depot";

// ---------- Chargement des comptes ----------
// Récupère la liste des comptes et remplit le menu déroulant de sélection
async function charger() {
  // J'appelle l'API (GET /api/comptes par défaut, voir app.js)
  const r = await api();
  // Si la requête a réussi je stocke les comptes, sinon un tableau vide pour ne pas planter
  comptes = r.ok ? r.data : [];
  // Je récupère le menu déroulant <select> où l'utilisateur choisit son compte
  const sel = document.getElementById("compteSel");

  // Cas où il n'y a aucun compte : j'affiche un message dans le menu
  // et je m'arrête là, car on ne peut pas faire d'opération sans compte
  if (!comptes.length) {
    sel.innerHTML = `<option value="">Aucun compte — créez-en un d'abord</option>`;
    return;
  }

  // Sinon je remplis le menu avec une option par compte.
  // Chaque option affiche le numéro sur 5 chiffres (ex: #00042) et le nom du titulaire
  // (esc() protège contre l'injection HTML), et sa valeur est l'id du compte
  sel.innerHTML = comptes
    .map((c) => `<option value="${c.id}">#${String(c.id).padStart(5, "0")} — ${esc(c.titulaire)}</option>`)
    .join("");

  // Si je viens d'une autre page avec un lien du type operations.html?id=3
  // (bouton "Opérer" de la page Comptes), je présélectionne ce compte dans le menu
  const idUrl = new URLSearchParams(location.search).get("id");
  if (idUrl) sel.value = idUrl;

  // J'affiche le solde du compte actuellement sélectionné
  majSolde();
}

// ---------- Mise à jour de l'affichage du solde ----------
// Met à jour la carte qui montre le nom et le solde du compte choisi
function majSolde() {
  // Je retrouve le compte sélectionné dans mon tableau grâce à l'id du menu déroulant.
  // J'utilise == (et pas ===) car la valeur du select est du texte alors que x.id est un nombre
  const c = comptes.find((x) => x.id == document.getElementById("compteSel").value);
  // Si un compte est trouvé j'affiche son nom, sinon un message d'invitation à en choisir un
  document.getElementById("soldeNom").textContent = c ? `Solde de ${c.titulaire}` : "Sélectionnez un compte";
  // Même logique pour le solde : montant formaté en dollars, ou un tiret si aucun compte
  document.getElementById("soldeVal").textContent = c ? fmt(c.solde) : "— $";
  // Je mets à jour le lien vers l'historique pour qu'il pointe vers le bon compte
  document.getElementById("lienHisto").href = c ? `historique.html?id=${c.id}` : "historique.html";
}

// ---------- Changement du type d'opération ----------
// Appelée quand l'utilisateur clique sur l'onglet "Dépôt" ou "Retrait"
function setType(t) {
  // Je mémorise le type choisi, il sera utilisé plus tard dans valider()
  type = t;
  // Je mets en surbrillance l'onglet actif : toggle ajoute la classe "active" si la condition
  // est vraie et l'enlève sinon, donc un seul onglet est actif à la fois
  document.getElementById("tabDepot").classList.toggle("active", t === "depot");
  document.getElementById("tabRetrait").classList.toggle("active", t === "retrait");
  // J'adapte le bouton de validation : texte différent selon le type
  // et couleur différente (vert pour un dépôt, rouge pour un retrait)
  const btn = document.getElementById("btnValider");
  btn.textContent = t === "depot" ? "Valider le dépôt" : "Valider le retrait";
  btn.className = "btn btn-block " + (t === "depot" ? "btn-success" : "btn-danger");
}

// ---------- Montants rapides ----------
// Appelée par les boutons de raccourci (ex: 50 $, 100 $, 200 $)
// pour remplir automatiquement le champ montant
function setMontant(v) { document.getElementById("montant").value = v; }

// ---------- Validation de l'opération ----------
// Appelée quand l'utilisateur clique sur le bouton de validation.
// Envoie le dépôt ou le retrait à l'API Flask
async function valider() {
  // Je récupère le compte choisi et le montant saisi
  const id = document.getElementById("compteSel").value;
  const montant = document.getElementById("montant").value;

  // Vérifications côté client avant d'appeler l'API (l'API refait ses propres vérifications).
  // Si aucun compte n'est choisi ou si le montant est vide ou négatif, j'affiche une erreur et je m'arrête
  if (!id) return toast("Choisissez un compte", "error");
  if (!montant || montant <= 0) return toast("Entrez un montant valide", "error");

  // J'envoie la requête POST vers /api/comptes/<id>/depot ou /api/comptes/<id>/retrait
  // (selon la valeur de "type") avec le montant dans le corps de la requête
  const r = await api(`${API}/${id}/${type}`, "POST", { montant });

  if (r.ok) {
    // Succès : j'affiche le message renvoyé par l'API avec le nouveau solde
    toast(`${r.data.message} — nouveau solde : ${fmt(r.data.nouveau_solde)}`, "success");
    // Je vide le champ montant pour préparer une éventuelle nouvelle opération
    document.getElementById("montant").value = "";
    // Je recharge les comptes pour que le solde affiché soit à jour
    charger();
  } else toast(r.data.erreur, "error"); // Échec (ex: solde insuffisant) : j'affiche l'erreur de l'API
}

// ---------- Initialisation de la page ----------
// Quand l'utilisateur choisit un autre compte dans le menu déroulant,
// je mets à jour le solde affiché
document.getElementById("compteSel").addEventListener("change", majSolde);

// Au chargement de la page, je récupère la liste des comptes
charger();