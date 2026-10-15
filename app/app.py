# On importe os pour lire les variables d'environnement (configuration de la BD)
import os
# On importe time pour faire des pauses pendant l'attente de la base de données
import time
# On importe Flask pour créer l'API, jsonify pour renvoyer du JSON, request pour lire les données reçues
from flask import Flask, jsonify, request
# On importe le connecteur MySQL pour communiquer avec la base de données
import mysql.connector

# Je crée l'application Flask : c'est elle qui va recevoir et traiter les requêtes HTTP
app = Flask(__name__)

# Cette fonction ouvre une connexion vers MySQL.
# Je lis les paramètres dans les variables d'environnement (définies dans docker-compose.yml)
# et je mets des valeurs par défaut au cas où elles ne seraient pas définies.
def get_connection():
    return mysql.connector.connect(
        host=os.getenv("DB_HOST", "db"),            # "db" = nom du service MySQL dans docker-compose
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASSWORD", "password"),
        database=os.getenv("DB_NAME", "banque"),
    )

# Au démarrage, MySQL met du temps à être prêt alors que l'API démarre vite.
# Cette fonction essaie de se connecter jusqu'à 30 fois (toutes les 2 secondes)
# pour éviter que l'API plante si la base n'est pas encore disponible.
def attendre_bd():
    for _ in range(30):
        try:
            get_connection().close()   # si la connexion réussit, la base est prête
            return
        except Exception:
            time.sleep(2)              # sinon j'attends 2 secondes puis je réessaie

# J'appelle la fonction dès le lancement du fichier, avant de recevoir des requêtes
attendre_bd()

def formater(ligne):
    """Convertit Decimal -> float et datetime -> str pour le JSON."""
    # MySQL renvoie des types (Decimal, datetime) que jsonify ne sait pas convertir en JSON.
    # Je parcours donc chaque colonne et je transforme ces types en types simples.
    out = {}
    for k, v in ligne.items():
        if hasattr(v, "isoformat"):
            # Si la valeur est une date/heure, je la transforme en texte lisible
            out[k] = v.strftime("%Y-%m-%d %H:%M:%S")
        elif v.__class__.__name__ == "Decimal":
            # Si c'est un Decimal (ex : le solde), je le transforme en nombre à virgule
            out[k] = float(v)
        else:
            # Sinon (texte, entier...), je garde la valeur telle quelle
            out[k] = v
    return out

# Cette fonction vérifie qu'un montant reçu est bien un nombre.
# Elle l'arrondit à 2 décimales (comme les centimes) ou renvoie None si c'est invalide.
def lire_montant(valeur):
    try:
        m = round(float(valeur), 2)
    except (TypeError, ValueError):
        return None   # la valeur n'est pas convertible en nombre
    return m

# ---------- creerCompte ----------
# Route POST /api/comptes : crée un nouveau compte bancaire
@app.route("/api/comptes", methods=["POST"])
def creer_compte():
    # Je récupère le JSON envoyé par le client (silent=True évite une erreur si le JSON est mal formé)
    data = request.get_json(silent=True) or {}
    titulaire = (data.get("titulaire") or "").strip()    # je retire les espaces inutiles
    solde = lire_montant(data.get("solde", 0))           # solde initial, 0 par défaut

    # Validations : je refuse la requête si les données sont incorrectes
    if not titulaire:
        return jsonify({"erreur": "Le titulaire est obligatoire"}), 400
    if solde is None or solde < 0:
        return jsonify({"erreur": "Solde initial invalide"}), 400

    # J'ouvre la connexion et j'insère le nouveau compte
    cnx = get_connection()
    cur = cnx.cursor()
    # J'utilise des paramètres (%s) plutôt que de concaténer : ça protège contre les injections SQL
    cur.execute("INSERT INTO comptes (titulaire, solde) VALUES (%s, %s)", (titulaire, solde))
    id_compte = cur.lastrowid   # je récupère l'identifiant auto-généré du compte
    # Si un solde initial a été fourni, je l'enregistre comme un premier dépôt dans l'historique
    if solde > 0:
        cur.execute(
            "INSERT INTO transactions (id_compte, type, montant) VALUES (%s, 'DEPOT', %s)",
            (id_compte, solde),
        )
    cnx.commit()    # je valide les modifications dans la base
    cur.close()
    cnx.close()
    # Je renvoie le code 201 (Created) avec l'id du nouveau compte
    return jsonify({"message": "Compte créé", "id": id_compte}), 201

# ---------- listerComptes ----------
# Route GET /api/comptes : renvoie tous les comptes
@app.route("/api/comptes", methods=["GET"])
def lister_comptes():
    cnx = get_connection()
    cur = cnx.cursor(dictionary=True)   # dictionary=True : chaque ligne devient un dictionnaire (colonne -> valeur)
    cur.execute("SELECT * FROM comptes ORDER BY id DESC")   # les plus récents d'abord
    lignes = [formater(l) for l in cur.fetchall()]          # je convertis chaque ligne pour le JSON
    cur.close()
    cnx.close()
    return jsonify(lignes)

# ---------- consulterCompte ----------
# Route GET /api/comptes/<id> : renvoie un seul compte
@app.route("/api/comptes/<int:id_compte>", methods=["GET"])
def consulter_compte(id_compte):
    cnx = get_connection()
    cur = cnx.cursor(dictionary=True)
    cur.execute("SELECT * FROM comptes WHERE id = %s", (id_compte,))
    ligne = cur.fetchone()   # fetchone : une seule ligne attendue (ou None si rien trouvé)
    cur.close()
    cnx.close()
    # Si aucun compte ne correspond à cet id, je renvoie une erreur 404 (introuvable)
    if not ligne:
        return jsonify({"erreur": "Compte introuvable"}), 404
    return jsonify(formater(ligne))

# ---------- deposerArgent ----------
# Route POST /api/comptes/<id>/depot : ajoute de l'argent sur un compte
@app.route("/api/comptes/<int:id_compte>/depot", methods=["POST"])
def deposer(id_compte):
    # Je lis le montant envoyé et je le valide
    montant = lire_montant((request.get_json(silent=True) or {}).get("montant"))
    if montant is None or montant <= 0:
        return jsonify({"erreur": "Montant invalide"}), 400

    cnx = get_connection()
    cur = cnx.cursor(dictionary=True)
    # FOR UPDATE verrouille la ligne du compte le temps de la transaction,
    # pour éviter que deux opérations simultanées faussent le solde
    cur.execute("SELECT solde FROM comptes WHERE id = %s FOR UPDATE", (id_compte,))
    ligne = cur.fetchone()
    # Si le compte n'existe pas, je ferme proprement les connexions et je renvoie 404
    if not ligne:
        cur.close(); cnx.close()
        return jsonify({"erreur": "Compte introuvable"}), 404

    # J'augmente le solde, puis j'enregistre l'opération dans l'historique
    cur.execute("UPDATE comptes SET solde = solde + %s WHERE id = %s", (montant, id_compte))
    cur.execute(
        "INSERT INTO transactions (id_compte, type, montant) VALUES (%s, 'DEPOT', %s)",
        (id_compte, montant),
    )
    cnx.commit()   # les deux requêtes sont validées ensemble (transaction)
    # Je relis le solde pour pouvoir renvoyer la valeur à jour au client
    cur.execute("SELECT solde FROM comptes WHERE id = %s", (id_compte,))
    nouveau = float(cur.fetchone()["solde"])
    cur.close()
    cnx.close()
    return jsonify({"message": "Dépôt effectué", "nouveau_solde": nouveau})

# ---------- retirerArgent ----------
# Route POST /api/comptes/<id>/retrait : retire de l'argent d'un compte
@app.route("/api/comptes/<int:id_compte>/retrait", methods=["POST"])
def retirer(id_compte):
    # Même validation du montant que pour le dépôt
    montant = lire_montant((request.get_json(silent=True) or {}).get("montant"))
    if montant is None or montant <= 0:
        return jsonify({"erreur": "Montant invalide"}), 400

    cnx = get_connection()
    cur = cnx.cursor(dictionary=True)
    # Je verrouille la ligne pour sécuriser la lecture puis la modification du solde
    cur.execute("SELECT solde FROM comptes WHERE id = %s FOR UPDATE", (id_compte,))
    ligne = cur.fetchone()
    if not ligne:
        cur.close(); cnx.close()
        return jsonify({"erreur": "Compte introuvable"}), 404
    # Règle métier : on ne peut pas retirer plus que ce qu'il y a sur le compte
    if float(ligne["solde"]) < montant:
        cur.close(); cnx.close()
        return jsonify({"erreur": "Solde insuffisant"}), 400

    # Je diminue le solde et j'enregistre le retrait dans l'historique
    cur.execute("UPDATE comptes SET solde = solde - %s WHERE id = %s", (montant, id_compte))
    cur.execute(
        "INSERT INTO transactions (id_compte, type, montant) VALUES (%s, 'RETRAIT', %s)",
        (id_compte, montant),
    )
    cnx.commit()
    # Je relis le nouveau solde pour le renvoyer au client
    cur.execute("SELECT solde FROM comptes WHERE id = %s", (id_compte,))
    nouveau = float(cur.fetchone()["solde"])
    cur.close()
    cnx.close()
    return jsonify({"message": "Retrait effectué", "nouveau_solde": nouveau})

# ---------- effacerCompte ----------
# Route DELETE /api/comptes/<id> : supprime un compte
@app.route("/api/comptes/<int:id_compte>", methods=["DELETE"])
def effacer(id_compte):
    cnx = get_connection()
    cur = cnx.cursor()
    cur.execute("DELETE FROM comptes WHERE id = %s", (id_compte,))
    cnx.commit()
    supprime = cur.rowcount   # nombre de lignes supprimées (0 si le compte n'existait pas)
    cur.close()
    cnx.close()
    # Si aucune ligne n'a été supprimée, c'est que le compte n'existe pas
    if not supprime:
        return jsonify({"erreur": "Compte introuvable"}), 404
    return jsonify({"message": "Compte supprimé"})

# ---------- historique ----------
# Route GET /api/comptes/<id>/historique : liste les transactions d'un compte
@app.route("/api/comptes/<int:id_compte>/historique", methods=["GET"])
def historique(id_compte):
    cnx = get_connection()
    cur = cnx.cursor(dictionary=True)
    # Je sélectionne uniquement les transactions de ce compte, de la plus récente à la plus ancienne
    cur.execute(
        "SELECT id, type, montant, date_transaction FROM transactions "
        "WHERE id_compte = %s ORDER BY date_transaction DESC, id DESC",
        (id_compte,),
    )
    lignes = [formater(l) for l in cur.fetchall()]   # conversion des types pour le JSON
    cur.close()
    cnx.close()
    return jsonify(lignes)

# Ce bloc ne s'exécute que si je lance directement ce fichier (python app.py).
# host="0.0.0.0" rend l'API accessible depuis l'extérieur du conteneur Docker,
# et le port 5000 est celui sur lequel Nginx redirige les requêtes /api/.
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)