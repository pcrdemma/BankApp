let comptes = [];

async function charger() {
  const r = await api();
  comptes = r.ok ? r.data : [];
  const sel = document.getElementById("compteSel");

  if (!comptes.length) {
    sel.innerHTML = `<option value="">Aucun compte</option>`;
    document.getElementById("tableau").innerHTML =
      `<tr><td colspan="3"><div class="empty"><span class="emoji">📭</span>Aucun compte. <a href="comptes.html?nouveau=1" style="color:var(--primary);font-weight:600">Créez-en un</a></div></td></tr>`;
    return;
  }

  sel.innerHTML = comptes
    .map((c) => `<option value="${c.id}">#${String(c.id).padStart(5, "0")} — ${esc(c.titulaire)}</option>`)
    .join("");
  const idUrl = new URLSearchParams(location.search).get("id");
  if (idUrl) sel.value = idUrl;
  chargerHistorique();
}

async function chargerHistorique() {
  const id = document.getElementById("compteSel").value;
  if (!id) return;
  document.getElementById("lienOperer").href = `operations.html?id=${id}`;

  const c = comptes.find((x) => x.id == id);
  document.getElementById("hSolde").textContent = fmt(c.solde);

  const r = await api(`${API}/${id}/historique`);
  const lignes = r.ok ? r.data : [];
  const corps = document.getElementById("tableau");

  const depots = lignes.filter((l) => l.type === "DEPOT").reduce((s, l) => s + l.montant, 0);
  const retraits = lignes.filter((l) => l.type === "RETRAIT").reduce((s, l) => s + l.montant, 0);
  document.getElementById("hDepots").textContent = fmt(depots);
  document.getElementById("hRetraits").textContent = fmt(retraits);

  if (!lignes.length) {
    corps.innerHTML = `<tr><td colspan="3"><div class="empty"><span class="emoji">🧾</span>Aucune transaction pour ce compte</div></td></tr>`;
    return;
  }

  corps.innerHTML = lignes.map((l) => `
    <tr>
      <td><span class="pill ${l.type.toLowerCase()}">${l.type === "DEPOT" ? "↓ Dépôt" : "↑ Retrait"}</span></td>
      <td class="amount" style="color:${l.type === "DEPOT" ? "var(--success)" : "var(--danger)"}">
        ${l.type === "DEPOT" ? "+" : "−"} ${fmt(l.montant)}
      </td>
      <td class="muted">${fmtDate(l.date_transaction)}</td>
    </tr>`).join("");
}

document.getElementById("compteSel").addEventListener("change", chargerHistorique);
charger();