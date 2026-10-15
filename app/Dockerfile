# Je pars d'une image Python 3.12 en version "slim" : elle contient juste l'essentiel,
# donc elle est beaucoup plus légère qu'une image Python complète
FROM python:3.12-slim

# Je définis le dossier de travail dans le conteneur : toutes les commandes suivantes
# s'exécuteront depuis /app (Docker le crée automatiquement s'il n'existe pas)
WORKDIR /app

# Je copie d'abord uniquement le fichier des dépendances (et pas tout le code).
# Comme ça, Docker garde en cache l'installation des librairies tant que
# requirements.txt ne change pas, ce qui accélère les prochains builds
COPY requirements.txt .

# J'installe les dépendances listées dans requirements.txt (Flask, MySQL connector, Gunicorn...)
# --no-cache-dir évite de garder les fichiers de téléchargement pour alléger l'image
RUN pip install --no-cache-dir -r requirements.txt

# Je copie ensuite le code de mon application dans le conteneur
COPY app.py .

# J'indique que l'application écoute sur le port 5000
# (c'est une documentation : le vrai mapping des ports se fait dans docker-compose.yml)
EXPOSE 5000

# Commande lancée au démarrage du conteneur : je démarre l'API avec Gunicorn
# plutôt qu'avec le serveur de développement de Flask, car Gunicorn est fait pour la production.
# --bind 0.0.0.0:5000 : l'API est accessible depuis l'extérieur du conteneur sur le port 5000
# --workers 2 : deux processus traitent les requêtes en parallèle
# app:app : fichier "app.py" (premier app) et variable Flask "app" à l'intérieur (second app)
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "2", "app:app"]