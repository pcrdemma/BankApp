let comptes = [];
let type = "depot";

async function charger() {
  const r = await api();
  comptes = r.ok ? r.data : [];
  const sel = document.getElementById("compteSel");
  if (!comptes.length) {
    sel.innerHTML = `<option value="">Aucun compte — créez-en un d'abord</option>`;
    return;
  }
  sel.innerHTML = comptes
    .map((c) => `<option value="${c.id}">#${String(c.id).padStart(5, "0")} — ${esc(c.titulaire)}</option>`)
    .join("");
  const idUrl = new URLSearchParams(location.search).get("id");
  if (idUrl) sel.value = idUrl;
  majSolde();
}

function majSolde() {
  const c = comptes.find((x) => x.id == document.getElementById("compteSel").value);
  document.getElementById("soldeNom").textContent = c ? `Solde de ${c.titulaire}` : "Sélectionnez un compte";
  document.getElementById("soldeVal").textContent = c ? fmt(c.solde) : "— $";
  document.getElementById("lienHisto").href = c ? `historique.html?id=${c.id}` : "historique.html";
}

function setType(t) {
  type = t;
  document.getElementById("tabDepot").classList.toggle("active", t === "depot");
  document.getElementById("tabRetrait").classList.toggle("active", t === "retrait");
  const btn = document.getElementById("btnValider");
  btn.textContent = t === "depot" ? "Valider le dépôt" : "Valider le retrait";
  btn.className = "btn btn-block " + (t === "depot" ? "btn-success" : "btn-danger");
}

function setMontant(v) { document.getElementById("montant").value = v; }

async function valider() {
  const id = document.getElementById("compteSel").value;
  const montant = document.getElementById("montant").value;
  if (!id) return toast("Choisissez un compte", "error");
  if (!montant || montant <= 0) return toast("Entrez un montant valide", "error");
  const r = await api(`${API}/${id}/${type}`, "POST", { montant });
  if (r.ok) {
    toast(`${r.data.message} — nouveau solde : ${fmt(r.data.nouveau_solde)}`, "success");
    document.getElementById("montant").value = "";
    charger();
  } else toast(r.data.erreur, "error");
}

document.getElementById("compteSel").addEventListener("change", majSolde);
charger();