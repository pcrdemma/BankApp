// Tableau qui contient tous les comptes récupérés depuis l'API.
// Je le garde en mémoire pour retrouver facilement le solde d'un compte
// quand l'utilisateur change de compte dans la liste déroulante
let comptes = [];

// ---------- Chargement des comptes ----------
// Récupère la liste des comptes et remplit le menu déroulant de sélection
async function charger() {
  // J'appelle l'API (GET /api/comptes par défaut, voir app.js)
  const r = await api();
  // Si la requête a réussi je stocke les comptes, sinon un tableau vide pour ne pas planter
  comptes = r.ok ? r.data : [];
  // Je récupère le menu déroulant <select> où l'utilisateur choisit son compte
  const sel = document.getElementById("compteSel");

  // Cas où il n'y a aucun compte : je mets une option vide dans le menu
  // et j'affiche un message dans le tableau avec un lien pour en créer un
  if (!comptes.length) {
    sel.innerHTML = `<option value="">Aucun compte</option>`;
    document.getElementById("tableau").innerHTML =
      `<tr><td colspan="3"><div class="empty"><span class="emoji">📭</span>Aucun compte. <a href="comptes.html?nouveau=1" style="color:var(--primary);font-weight:600">Créez-en un</a></div></td></tr>`;
    // Je m'arrête ici : pas de compte, donc pas d'historique à charger
    return;
  }

  // Sinon je remplis le menu avec une option par compte.
  // Chaque option affiche le numéro sur 5 chiffres (ex: #00042) et le nom du titulaire
  // (esc() protège contre l'injection HTML), et sa valeur est l'id du compte
  sel.innerHTML = comptes
    .map((c) => `<option value="${c.id}">#${String(c.id).padStart(5, "0")} — ${esc(c.titulaire)}</option>`)
    .join("");

  // Si je viens d'une autre page avec un lien du type historique.html?id=3
  // (bouton "Historique" de la page Comptes), je présélectionne ce compte dans le menu
  const idUrl = new URLSearchParams(location.search).get("id");
  if (idUrl) sel.value = idUrl;

  // J'affiche l'historique du compte actuellement sélectionné
  chargerHistorique();
}

// ---------- Chargement de l'historique d'un compte ----------
// Récupère les transactions du compte sélectionné et met à jour les statistiques et le tableau
async function chargerHistorique() {
  // Je lis l'id du compte choisi dans le menu déroulant
  const id = document.getElementById("compteSel").value;
  // Si rien n'est sélectionné, je ne fais rien
  if (!id) return;

  // Je mets à jour le lien "Opérer" pour qu'il mène vers la page des opérations
  // avec ce même compte déjà sélectionné
  document.getElementById("lienOperer").href = `operations.html?id=${id}`;

  // Je retrouve le compte dans mon tableau pour afficher son solde actuel.
  // J'utilise == (et pas ===) car id est du texte (valeur du select) alors que x.id est un nombre
  const c = comptes.find((x) => x.id == id);
  document.getElementById("hSolde").textContent = fmt(c.solde);

  // J'appelle l'API pour récupérer toutes les transactions de ce compte
  const r = await api(`${API}/${id}/historique`);
  // Si la requête échoue, je prends un tableau vide pour afficher "aucune transaction"
  const lignes = r.ok ? r.data : [];
  // Je récupère le <tbody> du tableau pour y injecter les lignes
  const corps = document.getElementById("tableau");

  // Je calcule le total des dépôts : je filtre uniquement les transactions de type DEPOT
  // puis reduce() additionne leurs montants (s = somme cumulée qui commence à 0)
  const depots = lignes.filter((l) => l.type === "DEPOT").reduce((s, l) => s + l.montant, 0);
  // Même chose pour le total des retraits
  const retraits = lignes.filter((l) => l.type === "RETRAIT").reduce((s, l) => s + l.montant, 0);
  // J'affiche ces deux totaux dans les cartes de statistiques
  document.getElementById("hDepots").textContent = fmt(depots);
  document.getElementById("hRetraits").textContent = fmt(retraits);

  // Si le compte n'a aucune transaction, j'affiche un message vide et j'arrête la fonction
  if (!lignes.length) {
    corps.innerHTML = `<tr><td colspan="3"><div class="empty"><span class="emoji">🧾</span>Aucune transaction pour ce compte</div></td></tr>`;
    return;
  }

  // Sinon je génère une ligne <tr> par transaction avec map(), puis je les colle avec join("")
  corps.innerHTML = lignes.map((l) => `
    <tr>
      <!-- Pastille colorée qui indique le type : la classe CSS (depot / retrait) change la couleur -->
      <td><span class="pill ${l.type.toLowerCase()}">${l.type === "DEPOT" ? "↓ Dépôt" : "↑ Retrait"}</span></td>
      <!-- Montant en vert avec un + pour un dépôt, en rouge avec un − pour un retrait -->
      <td class="amount" style="color:${l.type === "DEPOT" ? "var(--success)" : "var(--danger)"}">
        ${l.type === "DEPOT" ? "+" : "−"} ${fmt(l.montant)}
      </td>
      <!-- Date de la transaction formatée en français -->
      <td class="muted">${fmtDate(l.date_transaction)}</td>
    </tr>`).join("");
}

// ---------- Initialisation de la page ----------
// Quand l'utilisateur choisit un autre compte dans le menu déroulant,
// je recharge automatiquement l'historique de ce compte
document.getElementById("compteSel").addEventListener("change", chargerHistorique);

// Au chargement de la page, je récupère la liste des comptes (ce qui déclenche ensuite l'historique)
charger();