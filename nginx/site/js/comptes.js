// Tableau qui contient tous les comptes récupérés depuis l'API.
// Je le garde en mémoire pour pouvoir filtrer avec la recherche sans refaire une requête
let comptes = [];

// Compte que l'utilisateur est en train de vouloir supprimer.
// Il reste en mémoire le temps que l'utilisateur confirme dans la fenêtre modale
let aSupprimer = null;

// ---------- Chargement des comptes ----------
// Récupère la liste des comptes depuis l'API Flask puis met à jour l'affichage
async function charger() {
  // J'appelle l'API (GET /api/comptes par défaut, voir app.js)
  const r = await api();
  // Si la requête a réussi je stocke les comptes, sinon je mets un tableau vide
  // pour que la page affiche "Aucun compte trouvé" au lieu de planter
  comptes = r.ok ? r.data : [];
  afficher();
}

// ---------- Affichage du tableau ----------
// Construit les lignes du tableau HTML à partir des comptes (en tenant compte de la recherche)
function afficher() {
  // Je lis ce que l'utilisateur a tapé dans la barre de recherche, en minuscules
  // pour que la recherche ne soit pas sensible à la casse
  const q = document.getElementById("recherche").value.toLowerCase();

  // Je ne garde que les comptes dont le nom du titulaire contient le texte recherché
  const liste = comptes.filter((c) => c.titulaire.toLowerCase().includes(q));

  // Je récupère le <tbody> du tableau pour y injecter les lignes
  const corps = document.getElementById("tableau");

  // Si aucun compte ne correspond (ou qu'il n'y en a pas du tout),
  // j'affiche un message vide à la place du tableau et j'arrête la fonction ici
  if (!liste.length) {
    corps.innerHTML = `<tr><td colspan="5"><div class="empty"><span class="emoji">📭</span>Aucun compte trouvé</div></td></tr>`;
    return;
  }

  // Sinon je génère une ligne <tr> par compte avec map(), puis je les colle avec join("").
  corps.innerHTML = liste.map((c) => `
    <tr>
      <!-- Colonne titulaire : avatar avec les initiales + nom (esc() protège contre l'injection HTML) -->
      <td><span class="avatar">${esc(initiales(c.titulaire))}</span><b>${esc(c.titulaire)}</b></td>
      <!-- Numéro de compte sur 5 chiffres avec des zéros devant (ex: 42 devient #00042) -->
      <td class="muted">#${String(c.id).padStart(5, "0")}</td>
      <!-- Solde formaté en dollars canadiens -->
      <td class="amount">${fmt(c.solde)}</td>
      <!-- Date de création formatée en français -->
      <td class="muted">${fmtDate(c.date_creation)}</td>
      <!-- Boutons d'action : les deux liens passent l'id du compte dans l'URL (?id=...)
           pour que les autres pages sachent quel compte afficher -->
      <td style="text-align:right">
        <a class="btn btn-ghost btn-sm" href="operations.html?id=${c.id}">Opérer</a>
        <a class="btn btn-ghost btn-sm" href="historique.html?id=${c.id}">Historique</a>
        <button class="btn btn-danger btn-sm" onclick="demanderSuppr(${c.id})">Supprimer</button>
      </td>
    </tr>`).join("");
}

// ---------- Création d'un compte ----------
// Appelée quand l'utilisateur clique sur le bouton de la modale de création
async function creer() {
  // Je récupère les valeurs saisies dans le formulaire (trim() enlève les espaces inutiles)
  const titulaire = document.getElementById("titulaire").value.trim();
  const solde = document.getElementById("solde").value;

  // Vérification côté client : le nom est obligatoire.
  // Le return stoppe la fonction et affiche une notification d'erreur
  if (!titulaire) return toast("Le nom du titulaire est obligatoire", "error");

  // J'envoie les données à l'API en POST (l'API revérifie tout de son côté aussi)
  const r = await api(API, "POST", { titulaire, solde });

  if (r.ok) {
    // Succès : notification avec le numéro du compte, fermeture de la modale,
    // remise à zéro du formulaire, puis rechargement de la liste pour voir le nouveau compte
    toast(`Compte créé (#${r.data.id})`, "success");
    closeModal("modalCreer");
    document.getElementById("titulaire").value = "";
    document.getElementById("solde").value = 0;
    charger();
  } else toast(r.data.erreur, "error"); // Échec : j'affiche le message d'erreur renvoyé par l'API
}

// ---------- Suppression d'un compte (étape 1 : demande de confirmation) ----------
// Appelée par le bouton "Supprimer" d'une ligne. Je ne supprime pas tout de suite :
// je demande d'abord confirmation pour éviter les suppressions par erreur
function demanderSuppr(id) {
  // Je retrouve le compte concerné dans mon tableau grâce à son id et je le mets de côté
  aSupprimer = comptes.find((c) => c.id === id);
  // J'affiche un message de confirmation personnalisé avec le nom et le solde du compte
  document.getElementById("supprTexte").textContent =
    `Le compte de ${aSupprimer.titulaire} (solde : ${fmt(aSupprimer.solde)}) sera définitivement supprimé.`;
  // J'ouvre la fenêtre modale de confirmation
  openModal("modalSuppr");
}

// ---------- Suppression d'un compte (étape 2 : confirmation) ----------
// Appelée quand l'utilisateur clique sur "Confirmer" dans la modale
async function confirmerSuppr() {
  // J'envoie la requête DELETE à l'API avec l'id du compte à supprimer
  const r = await api(`${API}/${aSupprimer.id}`, "DELETE");
  // Je ferme la modale
  closeModal("modalSuppr");
  // J'affiche une notification : succès (vert) ou erreur (rouge) selon le résultat
  toast(r.ok ? "Compte supprimé" : r.data.erreur, r.ok ? "success" : "error");
  // Je recharge la liste pour que le compte supprimé disparaisse du tableau
  charger();
}

// ---------- Initialisation de la page ----------
// À chaque fois que l'utilisateur tape une lettre dans la recherche,
// je réaffiche le tableau filtré en direct (sans appeler l'API)
document.getElementById("recherche").addEventListener("input", afficher);

// Ouvre directement la modale si ?nouveau=1
// (c'est le cas quand on clique sur "Ouvrir un compte" dans le header ou le footer).
// URLSearchParams permet de lire les paramètres de l'URL
if (new URLSearchParams(location.search).get("nouveau")) openModal("modalCreer");

// Au chargement de la page, je récupère et j'affiche la liste des comptes
charger();