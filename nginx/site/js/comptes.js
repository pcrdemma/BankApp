let comptes = [];
let aSupprimer = null;

async function charger() {
  const r = await api();
  comptes = r.ok ? r.data : [];
  afficher();
}

function afficher() {
  const q = document.getElementById("recherche").value.toLowerCase();
  const liste = comptes.filter((c) => c.titulaire.toLowerCase().includes(q));
  const corps = document.getElementById("tableau");

  if (!liste.length) {
    corps.innerHTML = `<tr><td colspan="5"><div class="empty"><span class="emoji">📭</span>Aucun compte trouvé</div></td></tr>`;
    return;
  }
  corps.innerHTML = liste.map((c) => `
    <tr>
      <td><span class="avatar">${esc(initiales(c.titulaire))}</span><b>${esc(c.titulaire)}</b></td>
      <td class="muted">#${String(c.id).padStart(5, "0")}</td>
      <td class="amount">${fmt(c.solde)}</td>
      <td class="muted">${fmtDate(c.date_creation)}</td>
      <td style="text-align:right">
        <a class="btn btn-ghost btn-sm" href="operations.html?id=${c.id}">Opérer</a>
        <a class="btn btn-ghost btn-sm" href="historique.html?id=${c.id}">Historique</a>
        <button class="btn btn-danger btn-sm" onclick="demanderSuppr(${c.id})">Supprimer</button>
      </td>
    </tr>`).join("");
}

async function creer() {
  const titulaire = document.getElementById("titulaire").value.trim();
  const solde = document.getElementById("solde").value;
  if (!titulaire) return toast("Le nom du titulaire est obligatoire", "error");
  const r = await api(API, "POST", { titulaire, solde });
  if (r.ok) {
    toast(`Compte créé (#${r.data.id})`, "success");
    closeModal("modalCreer");
    document.getElementById("titulaire").value = "";
    document.getElementById("solde").value = 0;
    charger();
  } else toast(r.data.erreur, "error");
}

function demanderSuppr(id) {
  aSupprimer = comptes.find((c) => c.id === id);
  document.getElementById("supprTexte").textContent =
    `Le compte de ${aSupprimer.titulaire} (solde : ${fmt(aSupprimer.solde)}) sera définitivement supprimé.`;
  openModal("modalSuppr");
}

async function confirmerSuppr() {
  const r = await api(`${API}/${aSupprimer.id}`, "DELETE");
  closeModal("modalSuppr");
  toast(r.ok ? "Compte supprimé" : r.data.erreur, r.ok ? "success" : "error");
  charger();
}

document.getElementById("recherche").addEventListener("input", afficher);
// Ouvre directement la modale si ?nouveau=1
if (new URLSearchParams(location.search).get("nouveau")) openModal("modalCreer");
charger();