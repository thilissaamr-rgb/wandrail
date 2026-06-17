# On part d'une image Python 3.11 officielle
# C'est comme dire "je veux un ordi avec Python déjà installé"
FROM python:3.11-slim

# Le dossier de travail dans le container
WORKDIR /app

# On copie et installe les dépendances en premier
# (c'est plus rapide pour les rebuilds)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# On copie tout le projet dans le container
COPY . .

# Le port que Streamlit va utiliser
EXPOSE 8501

CMD ["streamlit", "run", "app/main.py", "--server.port=8501", "--server.address=0.0.0.0"]