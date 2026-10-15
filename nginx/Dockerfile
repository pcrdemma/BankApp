# Image de base : nginx en version légère (basée sur Alpine Linux)
FROM nginx:alpine

# Je supprime la configuration par défaut de nginx pour éviter qu'elle entre en conflit avec la mienne
RUN rm /etc/nginx/conf.d/default.conf

# Je copie mon fichier de configuration personnalisé dans le dossier où nginx le lit au démarrage
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Je copie tout le contenu du dossier site/ (HTML, CSS, JS) dans le dossier racine
# que nginx utilise pour servir les pages du site
COPY site/ /usr/share/nginx/html/

# J'indique que le conteneur écoute sur le port 80 (port HTTP standard).
# Cette ligne est purement informative : elle ne publie pas le port, c'est le rôle de docker-compose
EXPOSE 80