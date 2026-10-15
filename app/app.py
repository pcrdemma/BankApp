import os
import time
from flask import Flask, jsonify, request
import mysql.connector

app = Flask(__name__)


def get_connection():
    return mysql.connector.connect(
        host=os.getenv("DB_HOST", "db"),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASSWORD", "password"),
        database=os.getenv("DB_NAME", "banque"),
    )


def attendre_bd():
    for _ in range(30):
        try:
            get_connection().close()
            return
        except Exception:
            time.sleep(2)


attendre_bd()


def formater(ligne):
    """Convertit Decimal -> float et datetime -> str pour le JSON."""
    out = {}
    for k, v in ligne.items():
        if hasattr(v, "isoformat"):
            out[k] = v.strftime("%Y-%m-%d %H:%M:%S")
        elif v.__class__.__name__ == "Decimal":
            out[k] = float(v)
        else:
            out[k] = v
    return out


def lire_montant(valeur):
    try:
        m = round(float(valeur), 2)
    except (TypeError, ValueError):
        return None
    return m


# ---------- creerCompte ----------
@app.route("/api/comptes", methods=["POST"])
def creer_compte():
    data = request.get_json(silent=True) or {}
    titulaire = (data.get("titulaire") or "").strip()
    solde = lire_montant(data.get("solde", 0))
    if not titulaire:
        return jsonify({"erreur": "Le titulaire est obligatoire"}), 400
    if solde is None or solde < 0:
        return jsonify({"erreur": "Solde initial invalide"}), 400

    cnx = get_connection()
    cur = cnx.cursor()
    cur.execute("INSERT INTO comptes (titulaire, solde) VALUES (%s, %s)", (titulaire, solde))
    id_compte = cur.lastrowid
    if solde > 0:
        cur.execute(
            "INSERT INTO transactions (id_compte, type, montant) VALUES (%s, 'DEPOT', %s)",
            (id_compte, solde),
        )
    cnx.commit()
    cur.close()
    cnx.close()
    return jsonify({"message": "Compte créé", "id": id_compte}), 201


# ---------- listerComptes ----------
@app.route("/api/comptes", methods=["GET"])
def lister_comptes():
    cnx = get_connection()
    cur = cnx.cursor(dictionary=True)
    cur.execute("SELECT * FROM comptes ORDER BY id DESC")
    lignes = [formater(l) for l in cur.fetchall()]
    cur.close()
    cnx.close()
    return jsonify(lignes)


# ---------- consulterCompte ----------
@app.route("/api/comptes/<int:id_compte>", methods=["GET"])
def consulter_compte(id_compte):
    cnx = get_connection()
    cur = cnx.cursor(dictionary=True)
    cur.execute("SELECT * FROM comptes WHERE id = %s", (id_compte,))
    ligne = cur.fetchone()
    cur.close()
    cnx.close()
    if not ligne:
        return jsonify({"erreur": "Compte introuvable"}), 404
    return jsonify(formater(ligne))


# ---------- deposerArgent ----------
@app.route("/api/comptes/<int:id_compte>/depot", methods=["POST"])
def deposer(id_compte):
    montant = lire_montant((request.get_json(silent=True) or {}).get("montant"))
    if montant is None or montant <= 0:
        return jsonify({"erreur": "Montant invalide"}), 400

    cnx = get_connection()
    cur = cnx.cursor(dictionary=True)
    cur.execute("SELECT solde FROM comptes WHERE id = %s FOR UPDATE", (id_compte,))
    ligne = cur.fetchone()
    if not ligne:
        cur.close(); cnx.close()
        return jsonify({"erreur": "Compte introuvable"}), 404

    cur.execute("UPDATE comptes SET solde = solde + %s WHERE id = %s", (montant, id_compte))
    cur.execute(
        "INSERT INTO transactions (id_compte, type, montant) VALUES (%s, 'DEPOT', %s)",
        (id_compte, montant),
    )
    cnx.commit()
    cur.execute("SELECT solde FROM comptes WHERE id = %s", (id_compte,))
    nouveau = float(cur.fetchone()["solde"])
    cur.close()
    cnx.close()
    return jsonify({"message": "Dépôt effectué", "nouveau_solde": nouveau})


# ---------- retirerArgent ----------
@app.route("/api/comptes/<int:id_compte>/retrait", methods=["POST"])
def retirer(id_compte):
    montant = lire_montant((request.get_json(silent=True) or {}).get("montant"))
    if montant is None or montant <= 0:
        return jsonify({"erreur": "Montant invalide"}), 400

    cnx = get_connection()
    cur = cnx.cursor(dictionary=True)
    cur.execute("SELECT solde FROM comptes WHERE id = %s FOR UPDATE", (id_compte,))
    ligne = cur.fetchone()
    if not ligne:
        cur.close(); cnx.close()
        return jsonify({"erreur": "Compte introuvable"}), 404
    if float(ligne["solde"]) < montant:
        cur.close(); cnx.close()
        return jsonify({"erreur": "Solde insuffisant"}), 400

    cur.execute("UPDATE comptes SET solde = solde - %s WHERE id = %s", (montant, id_compte))
    cur.execute(
        "INSERT INTO transactions (id_compte, type, montant) VALUES (%s, 'RETRAIT', %s)",
        (id_compte, montant),
    )
    cnx.commit()
    cur.execute("SELECT solde FROM comptes WHERE id = %s", (id_compte,))
    nouveau = float(cur.fetchone()["solde"])
    cur.close()
    cnx.close()
    return jsonify({"message": "Retrait effectué", "nouveau_solde": nouveau})


# ---------- effacerCompte ----------
@app.route("/api/comptes/<int:id_compte>", methods=["DELETE"])
def effacer(id_compte):
    cnx = get_connection()
    cur = cnx.cursor()
    cur.execute("DELETE FROM comptes WHERE id = %s", (id_compte,))
    cnx.commit()
    supprime = cur.rowcount
    cur.close()
    cnx.close()
    if not supprime:
        return jsonify({"erreur": "Compte introuvable"}), 404
    return jsonify({"message": "Compte supprimé"})


# ---------- historique ----------
@app.route("/api/comptes/<int:id_compte>/historique", methods=["GET"])
def historique(id_compte):
    cnx = get_connection()
    cur = cnx.cursor(dictionary=True)
    cur.execute(
        "SELECT id, type, montant, date_transaction FROM transactions "
        "WHERE id_compte = %s ORDER BY date_transaction DESC, id DESC",
        (id_compte,),
    )
    lignes = [formater(l) for l in cur.fetchall()]
    cur.close()
    cnx.close()
    return jsonify(lignes)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)