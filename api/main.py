"""API Wandrail - couche de donnees pour le front React.

Expose en lecture les donnees touristiques de l'architecture Medaillon
(schemas silver / gold).

Lancement local :
    cd api
    pip install -r requirements.txt
    uvicorn main:app --reload --port 8000

Documentation interactive : http://localhost:8000/docs
"""
import hashlib
import os
import secrets

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import text

from db import engine

app = FastAPI(
    title="Wandrail API",
    description="Donnees tourisme en train - Pays de la Loire",
    version="0.1.0",
)

# ── CORS : autoriser le front (dev Vite + prod) ────────────────────
origins = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173",
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in origins if o.strip()],
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


# ── Helpers ────────────────────────────────────────────────────────
def rows_to_dicts(result):
    """Convertit un resultat SQLAlchemy en liste de dictionnaires."""
    cols = result.keys()
    return [dict(zip(cols, row)) for row in result.fetchall()]


# ── Authentification (hachage pbkdf2, identique a l'app Streamlit) ──
def hash_pw(pw: str) -> str:
    salt = secrets.token_hex(16)
    h = hashlib.pbkdf2_hmac("sha256", pw.encode(), salt.encode(), 100000)
    return f"{salt}:{h.hex()}"


def verify_pw(pw: str, stored: str) -> bool:
    try:
        salt, h = stored.split(":")
        h2 = hashlib.pbkdf2_hmac("sha256", pw.encode(), salt.encode(), 100000)
        return secrets.compare_digest(h2.hex(), h)
    except Exception:
        return False


class RegisterIn(BaseModel):
    email: str
    pseudo: str
    password: str
    ville_depart: str | None = None


class LoginIn(BaseModel):
    email: str
    password: str


class FavoriteIn(BaseModel):
    user_id: int
    destination: str


# ── Endpoints ──────────────────────────────────────────────────────
@app.get("/api/health")
def health():
    """Verifie que l'API et la base repondent."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"status": "ok", "db": "ok"}
    except Exception as exc:
        return {"status": "ok", "db": "error", "detail": str(exc)}


@app.get("/api/stats")
def stats():
    """Chiffres cles affiches sur la page d'accueil."""
    sql = text(
        """
        SELECT
          (SELECT COUNT(*) FROM silver.gares WHERE latitude IS NOT NULL) AS nb_gares,
          (SELECT COUNT(*) FROM silver.poi) AS nb_lieux,
          (SELECT COUNT(DISTINCT departement) FROM silver.gares
             WHERE departement IS NOT NULL) AS nb_departements
        """
    )
    with engine.connect() as conn:
        row = conn.execute(sql).fetchone()
    return {
        "nb_gares": row[0],
        "nb_lieux": row[1],
        "nb_departements": row[2],
        "co2_vs_voiture_pct": 91,
        "nb_profils": 5,
    }


@app.get("/api/departements")
def departements():
    """Liste des departements (pour les filtres)."""
    sql = text(
        """
        SELECT DISTINCT departement FROM silver.gares
        WHERE departement IS NOT NULL ORDER BY departement
        """
    )
    with engine.connect() as conn:
        rows = conn.execute(sql).fetchall()
    return [r[0] for r in rows]


@app.get("/api/profils")
def profils():
    """Liste des profils touristiques distincts (pour les filtres)."""
    sql = text(
        """
        SELECT DISTINCT profil_touristique FROM gold.dim_gare
        WHERE profil_touristique IS NOT NULL ORDER BY profil_touristique
        """
    )
    with engine.connect() as conn:
        rows = conn.execute(sql).fetchall()
    return [r[0] for r in rows]


@app.get("/api/destinations")
def destinations(
    q: str | None = Query(None, description="Recherche commune ou gare"),
    departement: str | None = None,
    profil: str | None = None,
    min_score: float = 0.0,
    sort: str = Query("score", pattern="^(score|nom|poi)$"),
    limit: int = Query(60, ge=1, le=500),
):
    """Liste filtrable des destinations (gares enrichies)."""
    clauses = [
        "g.latitude IS NOT NULL",
        "d.score_attractivite IS NOT NULL",
        "d.score_attractivite >= :min_score",
    ]
    params = {"min_score": min_score, "limit": limit}

    if q:
        clauses.append("(g.commune ILIKE :q OR g.nom_gare ILIKE :q)")
        params["q"] = f"%{q}%"
    if departement:
        clauses.append("g.departement = :departement")
        params["departement"] = departement
    if profil:
        clauses.append("d.profil_touristique = :profil")
        params["profil"] = profil

    order = {
        "score": "d.score_attractivite DESC",
        "nom": "g.commune ASC",
        "poi": "d.nb_poi_5km DESC",
    }[sort]

    sql = text(
        f"""
        SELECT g.nom_gare, g.commune, g.departement, g.latitude, g.longitude,
               d.score_attractivite, d.profil_touristique,
               d.nb_poi_5km, d.nb_categories
        FROM silver.gares g
        LEFT JOIN gold.dim_gare d ON d.code_uic = g.code_uic
        WHERE {" AND ".join(clauses)}
        ORDER BY {order}
        LIMIT :limit
        """
    )
    with engine.connect() as conn:
        return rows_to_dicts(conn.execute(sql, params))


@app.get("/api/destinations/{nom_gare}")
def destination_detail(nom_gare: str, rayon: float = Query(10.0, ge=0.5, le=50)):
    """Detail d'une destination + lieux a proximite de la gare."""
    sql_dest = text(
        """
        SELECT g.nom_gare, g.commune, g.departement, g.latitude, g.longitude,
               d.score_attractivite, d.profil_touristique,
               d.nb_poi_5km, d.nb_categories
        FROM silver.gares g
        LEFT JOIN gold.dim_gare d ON d.code_uic = g.code_uic
        WHERE g.nom_gare = :nom
        LIMIT 1
        """
    )
    sql_poi = text(
        """
        SELECT p.nom, p.categorie, p.commune, p.latitude, p.longitude,
               p.note_moyenne, pe.distance_gare_km, pe.temps_marche_min
        FROM silver.poi p
        JOIN silver.poi_enrichi pe ON pe.id_poi = p.id
        WHERE pe.nom_gare = :nom AND pe.distance_gare_km <= :rayon
          AND p.latitude IS NOT NULL
        ORDER BY pe.distance_gare_km
        LIMIT 300
        """
    )
    with engine.connect() as conn:
        result = conn.execute(sql_dest, {"nom": nom_gare})
        cols = result.keys()
        dest_row = result.fetchone()
        if dest_row is None:
            raise HTTPException(status_code=404, detail="Destination introuvable")
        dest = dict(zip(cols, dest_row))
        pois = rows_to_dicts(conn.execute(sql_poi, {"nom": nom_gare, "rayon": rayon}))
    return {"destination": dest, "pois": pois}


@app.get("/api/recommandations/{profil}")
def recommandations(profil: str):
    """Destinations recommandees pour un type de voyageur (Famille, Solo, ...).

    Source : gold.recommandations (modele de reco par profil). Renvoie la meme
    forme que /api/destinations pour reutiliser le meme affichage cote front.
    """
    sql = text(
        """
        SELECT s.nom_gare, s.commune, s.departement, s.latitude, s.longitude,
               d.score_attractivite, d.profil_touristique,
               d.nb_poi_5km, d.nb_categories
        FROM gold.recommandations r
        JOIN gold.dim_profil p ON p.id = r.id_profil
        JOIN gold.dim_gare d ON d.id = r.id_gare
        JOIN silver.gares s ON s.code_uic = d.code_uic
        WHERE p.nom = :profil
        ORDER BY r.rang
        """
    )
    with engine.connect() as conn:
        return rows_to_dicts(conn.execute(sql, {"profil": profil}))


# ── Comptes utilisateurs ───────────────────────────────────────────
@app.post("/api/auth/register")
def register(data: RegisterIn):
    """Cree un compte. Renvoie l'utilisateur (sans le mot de passe)."""
    email = data.email.strip().lower()
    if not email or not data.password or not data.pseudo.strip():
        raise HTTPException(status_code=400, detail="Champs manquants")
    with engine.begin() as conn:
        existing = conn.execute(
            text("SELECT id FROM userapp.users WHERE email = :e"), {"e": email}
        ).fetchone()
        if existing:
            raise HTTPException(status_code=409, detail="Email deja utilise")
        row = conn.execute(
            text(
                """
                INSERT INTO userapp.users (email, pseudo, password_hash, ville_depart)
                VALUES (:e, :p, :h, :v)
                RETURNING id, pseudo, email
                """
            ),
            {"e": email, "p": data.pseudo.strip(), "h": hash_pw(data.password),
             "v": data.ville_depart},
        ).fetchone()
    return {"id": row[0], "pseudo": row[1], "email": row[2]}


@app.post("/api/auth/login")
def login(data: LoginIn):
    """Connecte un utilisateur. Renvoie l'utilisateur (sans le mot de passe)."""
    email = data.email.strip().lower()
    with engine.connect() as conn:
        row = conn.execute(
            text("SELECT id, pseudo, email, password_hash FROM userapp.users WHERE email = :e"),
            {"e": email},
        ).fetchone()
    if row is None or not verify_pw(data.password, row[3]):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    return {"id": row[0], "pseudo": row[1], "email": row[2]}


# ── Favoris ────────────────────────────────────────────────────────
@app.get("/api/favorites/{user_id}")
def list_favorites(user_id: int):
    """Liste des destinations favorites d'un utilisateur (forme destination)."""
    sql = text(
        """
        SELECT g.nom_gare, g.commune, g.departement, g.latitude, g.longitude,
               d.score_attractivite, d.profil_touristique, d.nb_poi_5km, d.nb_categories
        FROM userapp.user_favorites f
        JOIN silver.gares g ON g.nom_gare = f.destination
        LEFT JOIN gold.dim_gare d ON d.code_uic = g.code_uic
        WHERE f.user_id = :u
        ORDER BY f.added_at DESC
        """
    )
    with engine.connect() as conn:
        return rows_to_dicts(conn.execute(sql, {"u": user_id}))


@app.post("/api/favorites")
def add_favorite(data: FavoriteIn):
    """Ajoute un favori (sans doublon)."""
    with engine.begin() as conn:
        ex = conn.execute(
            text("SELECT id FROM userapp.user_favorites WHERE user_id = :u AND destination = :d"),
            {"u": data.user_id, "d": data.destination},
        ).fetchone()
        if not ex:
            conn.execute(
                text("INSERT INTO userapp.user_favorites (user_id, destination) VALUES (:u, :d)"),
                {"u": data.user_id, "d": data.destination},
            )
    return {"ok": True, "favorite": True}


@app.delete("/api/favorites")
def remove_favorite(data: FavoriteIn):
    """Retire un favori."""
    with engine.begin() as conn:
        conn.execute(
            text("DELETE FROM userapp.user_favorites WHERE user_id = :u AND destination = :d"),
            {"u": data.user_id, "d": data.destination},
        )
    return {"ok": True, "favorite": False}
