-- Je crée la base de données "banque" seulement si elle n'existe pas déjà.
-- Le IF NOT EXISTS évite une erreur si le script est exécuté plusieurs fois
CREATE DATABASE IF NOT EXISTS banque;

-- Je sélectionne cette base : toutes les commandes suivantes s'appliqueront dessus
USE banque;

-- ---------- Table des comptes bancaires ----------
-- Cette table stocke les informations de chaque compte
CREATE TABLE IF NOT EXISTS comptes (
    -- Identifiant unique du compte, généré automatiquement (1, 2, 3...)
    id INT AUTO_INCREMENT PRIMARY KEY,
    -- Nom du titulaire du compte (obligatoire, 100 caractères maximum)
    titulaire VARCHAR(100) NOT NULL,
    -- Solde du compte : DECIMAL(12,2) = 12 chiffres au total dont 2 après la virgule.
    -- J'utilise DECIMAL plutôt que FLOAT pour éviter les erreurs d'arrondi sur l'argent.
    -- Le solde vaut 0 par défaut si aucune valeur n'est donnée
    solde DECIMAL(12,2) NOT NULL DEFAULT 0,
    -- Date de création du compte, remplie automatiquement avec la date et l'heure actuelles
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ---------- Table des transactions ----------
-- Cette table garde l'historique de tous les dépôts et retraits
CREATE TABLE IF NOT EXISTS transactions (
    -- Identifiant unique de la transaction, généré automatiquement
    id INT AUTO_INCREMENT PRIMARY KEY,
    -- Numéro du compte concerné par la transaction (obligatoire)
    id_compte INT NOT NULL,
    -- Type de transaction : seulement deux valeurs possibles, 'DEPOT' ou 'RETRAIT'
    type ENUM('DEPOT','RETRAIT') NOT NULL,
    -- Montant de la transaction, avec 2 décimales
    montant DECIMAL(12,2) NOT NULL,
    -- Date et heure de la transaction, remplies automatiquement
    date_transaction TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Clé étrangère : chaque transaction doit être liée à un compte qui existe vraiment.
    -- ON DELETE CASCADE : si je supprime un compte, toutes ses transactions
    -- sont supprimées automatiquement (pas de transactions "orphelines")
    FOREIGN KEY (id_compte) REFERENCES comptes(id) ON DELETE CASCADE
);