// Je crée une fonction asynchrone qui s'exécute automatiquement dès le chargement de la page
// (c'est une IIFE : elle est définie et appelée immédiatement avec le () à la fin)
(async function () {
  // J'appelle l'API pour récupérer la liste de tous les comptes
  // (api() utilise par défaut l'URL /api/comptes en GET, définie dans app.js)
  const r = await api();

  // Si la requête a échoué (serveur injoignable, erreur...), j'arrête tout ici
  // pour ne pas afficher de statistiques fausses
  if (!r.ok) return;

  // Je stocke le tableau des comptes reçus dans une variable
  const comptes = r.data;

  // Je calcule le solde total de la banque avec reduce() :
  // s = somme cumulée (qui commence à 0), c = compte courant dont j'ajoute le solde
  const total = comptes.reduce((s, c) => s + c.solde, 0);

  // J'affiche le nombre de comptes avec une animation de compteur
  // (le dernier paramètre est absent, donc c'est un nombre simple et pas un montant en argent)
  animateCount(document.getElementById("statComptes"), comptes.length);

  // J'affiche le solde total, avec le paramètre true pour le formater en dollars canadiens
  animateCount(document.getElementById("statSolde"), total, true);

  // J'affiche le solde moyen par compte (total divisé par le nombre de comptes).
  // Je vérifie d'abord qu'il y a au moins un compte pour éviter une division par zéro
  animateCount(document.getElementById("statMoyen"), comptes.length ? total / comptes.length : 0, true);
})();