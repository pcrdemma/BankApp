(async function () {
  const r = await api();
  if (!r.ok) return;
  const comptes = r.data;
  const total = comptes.reduce((s, c) => s + c.solde, 0);
  animateCount(document.getElementById("statComptes"), comptes.length);
  animateCount(document.getElementById("statSolde"), total, true);
  animateCount(document.getElementById("statMoyen"), comptes.length ? total / comptes.length : 0, true);
})();