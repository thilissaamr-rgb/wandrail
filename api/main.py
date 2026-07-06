"""API Wandrail - couche de donnees pour le front React.

Expose en lecture les donnees touristiques de l'architecture Medaillon
(schemas silver / gold).

Lancement local :
    cd api
    pip install -r requirements.txt
    uvicorn main:app --reload --port 8000

Documentation interactive : http://localhost:8000/docs
"""
import json
import os
import time
from threading import Lock
from typing import Any

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from db import engine
from analyst import build_decision_support, build_ml_metrics, build_overview, build_pipeline
from navitia import next_departures
from quality import build_data_quality_report
from security import create_access_token, current_user_id, hash_password, verify_password

app = FastAPI(
    title="Wandrail API",
    description="Donnees nationales du tourisme accessible en train en France",
    version="2.0.0",
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
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


# ── Cache in-memory pour les endpoints lents (analyste/data-quality) ──
# Ces endpoints font des calculs SQL lourds sur 287k POI. On garde le
# resultat en memoire pendant 5 min pour repondre en 20ms au lieu de 3-8s.
_CACHE: dict[str, tuple[float, Any]] = {}
_CACHE_LOCK = Lock()
_CACHE_TTL = 300  # 5 minutes


def cache_get(key: str) -> Any | None:
    """Renvoie la valeur cachee si elle existe et pas expiree."""
    with _CACHE_LOCK:
        hit = _CACHE.get(key)
        if hit and (time.time() - hit[0]) < _CACHE_TTL:
            return hit[1]
    return None


def cache_set(key: str, value: Any) -> Any:
    with _CACHE_LOCK:
        _CACHE[key] = (time.time(), value)
    return value


# ── Helpers ────────────────────────────────────────────────────────
def rows_to_dicts(result):
    """Convertit un resultat SQLAlchemy en liste de dictionnaires."""
    cols = result.keys()
    return [dict(zip(cols, row)) for row in result.fetchall()]


# ── Authentification (hachage pbkdf2, identique a l'app Streamlit) ──
class RegisterIn(BaseModel):
    email: str = Field(min_length=5, max_length=255)
    pseudo: str = Field(min_length=2, max_length=80)
    password: str = Field(min_length=8, max_length=128)
    ville_depart: str | None = Field(default=None, max_length=100)

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        value = value.strip().lower()
        if value.count("@") != 1 or "." not in value.rsplit("@", 1)[1]:
            raise ValueError("Adresse e-mail invalide")
        return value


class LoginIn(BaseModel):
    email: str = Field(min_length=5, max_length=255)
    password: str = Field(min_length=1, max_length=128)


class FavoriteIn(BaseModel):
    destination: str = Field(min_length=1, max_length=200)


class ProfileUpdateIn(BaseModel):
    pseudo: str = Field(min_length=2, max_length=80)
    ville_depart: str | None = Field(default=None, max_length=100)
    preferences: dict[str, Any] = Field(default_factory=dict)


@app.exception_handler(SQLAlchemyError)
def database_exception_handler(_request, _exc):
    return JSONResponse(
        status_code=503,
        content={"detail": "Service de donnees temporairement indisponible"},
    )


# ── Endpoints ──────────────────────────────────────────────────────
@app.get("/api/health")
def health():
    """Verifie que l'API et la base repondent."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"status": "ok", "db": "ok"}
    except Exception:
        return JSONResponse(status_code=503, content={"status": "error", "db": "error"})


@app.get("/api/data-quality")
def data_quality():
    """KPI data pour le tableau de bord. Reponse cachee 5 min."""
    hit = cache_get("data_quality")
    if hit is not None:
        return hit
    with engine.connect() as conn:
        return cache_set("data_quality", build_data_quality_report(conn))


@app.get("/api/anomalies")
def anomalies():
    hit = cache_get("anomalies")
    if hit is not None:
        return hit
    with engine.connect() as conn:
        report = build_data_quality_report(conn)
    return cache_set("anomalies", {
        "quality_score": report["quality_score"],
        "anomalies": report["anomalies"],
        "anomalies_total": report["anomalies_total"],
        "nulls": report["nulls"],
        "nulls_total": report["nulls_total"],
    })


@app.get("/api/pipeline")
def pipeline():
    hit = cache_get("pipeline")
    if hit is not None:
        return hit
    with engine.connect() as conn:
        return cache_set("pipeline", build_pipeline(conn))


@app.get("/api/ml-metrics")
def ml_metrics():
    hit = cache_get("ml_metrics")
    if hit is not None:
        return hit
    with engine.connect() as conn:
        return cache_set("ml_metrics", build_ml_metrics(conn))


@app.get("/api/analyste/overview")
def analyste_overview():
    hit = cache_get("analyste_overview")
    if hit is not None:
        return hit
    with engine.connect() as conn:
        return cache_set("analyste_overview", build_overview(conn))


@app.get("/api/analyste/decision")
def analyste_decision():
    hit = cache_get("analyste_decision")
    if hit is not None:
        return hit
    with engine.connect() as conn:
        return cache_set("analyste_decision", build_decision_support(conn))


@app.get("/api/top-destinations")
def top_destinations(limit: int = Query(10, ge=1, le=50)):
    sql = text(
        """
        SELECT nom_gare, commune, departement, score_attractivite AS score,
               nb_poi_5km, nb_categories, nb_voyageurs_annuel
        FROM gold.dim_gare
        WHERE score_attractivite IS NOT NULL
        ORDER BY score_attractivite DESC, nb_poi_5km DESC
        LIMIT :limit
        """
    )
    with engine.connect() as conn:
        return rows_to_dicts(conn.execute(sql, {"limit": limit}))


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
    categorie: str | None = Query(None, pattern="^(Nature|Restauration|Culture|Patrimoine|Hebergement|Loisirs|Evenement)$"),
    profil: str | None = None,
    min_score: float = 0.0,
    sort: str = Query("score", pattern="^(score|nom|poi)$"),
    limit: int = Query(60, ge=1, le=5000),
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
    if categorie:
        clauses.append("""EXISTS (
            SELECT 1 FROM silver.poi_enrichi pe
            WHERE pe.id_gare_1 = g.id AND pe.distance_gare_km <= 5
              AND pe.categorie = :categorie
        )""")
        params["categorie"] = categorie

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
               p.image_url, p.image_credit,
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


@app.get("/api/destinations/{nom_gare}/mobilites")
def destination_mobilites(nom_gare: str, rayon: float = Query(2.0, ge=0.3, le=10)):
    """Mobilite locale autour d'une gare : velos libre-service, bus, tram, ferry.

    Utilise silver.mobilites (45 162 stations chargees depuis OSM + open data).
    Groupe par type_mobilite et retourne les stations dans un rayon Haversine
    autour de la gare. Trie par distance croissante.
    """
    sql = text(
        """
        WITH gare AS (
            SELECT latitude, longitude FROM silver.gares WHERE nom_gare = :nom LIMIT 1
        )
        SELECT m.type_mobilite, m.nom_station, m.commune, m.latitude, m.longitude,
               m.nb_places,
               ROUND((
                 6371 * ACOS(
                   COS(RADIANS(g.latitude)) * COS(RADIANS(m.latitude)) *
                   COS(RADIANS(m.longitude) - RADIANS(g.longitude)) +
                   SIN(RADIANS(g.latitude)) * SIN(RADIANS(m.latitude))
                 )
               )::numeric, 2) AS distance_km
        FROM silver.mobilites m, gare g
        WHERE m.latitude IS NOT NULL AND m.longitude IS NOT NULL
          AND (
            6371 * ACOS(
              COS(RADIANS(g.latitude)) * COS(RADIANS(m.latitude)) *
              COS(RADIANS(m.longitude) - RADIANS(g.longitude)) +
              SIN(RADIANS(g.latitude)) * SIN(RADIANS(m.latitude))
            )
          ) <= :rayon
        ORDER BY distance_km ASC
        LIMIT 200
        """
    )
    with engine.connect() as conn:
        gare_exists = conn.execute(
            text("SELECT 1 FROM silver.gares WHERE nom_gare = :n LIMIT 1"), {"n": nom_gare}
        ).fetchone()
        if not gare_exists:
            raise HTTPException(status_code=404, detail="Gare introuvable")
        rows = rows_to_dicts(conn.execute(sql, {"nom": nom_gare, "rayon": rayon}))

    # Groupe par type + normalise (velo, parking_velo -> velo)
    groups = {"velo": [], "bus": [], "tram": [], "ferry": [], "parking_velo": []}
    for r in rows:
        t = (r.get("type_mobilite") or "").lower()
        if t in groups:
            groups[t].append(r)
    return {
        "gare": nom_gare,
        "rayon_km": rayon,
        "velos": groups["velo"],
        "parkings_velo": groups["parking_velo"],
        "bus": groups["bus"],
        "trams": groups["tram"],
        "ferries": groups["ferry"],
        "totaux": {k: len(v) for k, v in groups.items()},
    }


@app.get("/api/destinations/{nom_gare}/schedules")
def destination_schedules(nom_gare: str, count: int = Query(8, ge=1, le=20)):
    """Prochains departs SNCF temps reel via API Navitia (cache 5 min)."""
    with engine.connect() as conn:
        row = conn.execute(
            text("SELECT code_uic FROM silver.gares WHERE nom_gare = :n LIMIT 1"),
            {"n": nom_gare},
        ).fetchone()
    if row is None or not row[0]:
        return {"available": False, "departures": [], "error": "gare inconnue"}
    return next_departures(row[0], count=count)


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
               d.nb_poi_5km, d.nb_categories,
               r.rang, r.score_reco, r.raison
        FROM gold.recommandations r
        JOIN gold.dim_profil p ON p.id = r.id_profil
        JOIN gold.dim_gare d ON d.id = r.id_gare
        JOIN silver.gares s ON s.code_uic = d.code_uic
        WHERE p.nom = :profil
        ORDER BY r.rang
        """
    )
    with engine.connect() as conn:
        rows = rows_to_dicts(conn.execute(sql, {"profil": profil}))
    if not rows:
        raise HTTPException(status_code=404, detail="Profil de recommandation introuvable")
    return rows


# ── Comptes utilisateurs ───────────────────────────────────────────
@app.post("/api/auth/register")
def register(data: RegisterIn):
    """Cree un compte. Renvoie l'utilisateur (sans le mot de passe)."""
    email = data.email
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
                RETURNING id, pseudo, email, ville_depart, preferences
                """
            ),
            {"e": email, "p": data.pseudo.strip(), "h": hash_password(data.password),
             "v": data.ville_depart},
        ).fetchone()
    return {
        "id": row[0],
        "pseudo": row[1],
        "email": row[2],
        "ville_depart": row[3],
        "preferences": row[4] or {},
        "access_token": create_access_token(row[0]),
        "token_type": "bearer",
    }


@app.post("/api/auth/login")
def login(data: LoginIn):
    """Connecte un utilisateur. Renvoie l'utilisateur (sans le mot de passe)."""
    email = data.email.strip().lower()
    with engine.connect() as conn:
        row = conn.execute(
            text("SELECT id, pseudo, email, password_hash, ville_depart, preferences FROM userapp.users WHERE email = :e"),
            {"e": email},
        ).fetchone()
    if row is None or not verify_password(data.password, row[3]):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    return {
        "id": row[0],
        "pseudo": row[1],
        "email": row[2],
        "ville_depart": row[4],
        "preferences": row[5] or {},
        "access_token": create_access_token(row[0]),
        "token_type": "bearer",
    }


@app.get("/api/profile")
def profile(user_id: int = Depends(current_user_id)):
    """Profil, préférences et activité réelle de l'utilisateur connecté."""
    with engine.connect() as conn:
        user = conn.execute(
            text("""
                SELECT id, pseudo, email, ville_depart, preferences, created_at
                FROM userapp.users WHERE id = :u
            """), {"u": user_id}
        ).mappings().one_or_none()
        if user is None:
            raise HTTPException(status_code=404, detail="Compte introuvable")
        stats = conn.execute(
            text("""
                SELECT COUNT(*) AS nb_trajets,
                       COUNT(DISTINCT destination) AS villes_visitees,
                       COALESCE(SUM(co2_saved_kg), 0) AS co2_evite_kg
                FROM userapp.user_visits WHERE user_id = :u
            """), {"u": user_id}
        ).mappings().one()
        favorites_count = conn.execute(
            text("SELECT COUNT(*) FROM userapp.user_favorites WHERE user_id = :u"),
            {"u": user_id},
        ).scalar_one()
        visits = rows_to_dicts(conn.execute(
            text("""
                SELECT destination, co2_saved_kg, dist_km, visited_at
                FROM userapp.user_visits WHERE user_id = :u
                ORDER BY visited_at DESC LIMIT 8
            """), {"u": user_id}
        ))
    return {**dict(user), **dict(stats), "nb_favoris": favorites_count, "trajets": visits}


@app.patch("/api/profile")
def update_profile(data: ProfileUpdateIn, user_id: int = Depends(current_user_id)):
    allowed_preferences = {
        key: value for key, value in data.preferences.items()
        if key in {"voyageur", "envies"}
    }
    with engine.begin() as conn:
        row = conn.execute(
            text("""
                UPDATE userapp.users
                SET pseudo = :pseudo,
                    ville_depart = :ville,
                    preferences = CAST(:preferences AS jsonb)
                WHERE id = :u
                RETURNING id, pseudo, email, ville_depart, preferences
            """),
            {
                "pseudo": data.pseudo.strip(),
                "ville": (data.ville_depart or "").strip() or None,
                "preferences": json.dumps(allowed_preferences),
                "u": user_id,
            },
        ).mappings().one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail="Compte introuvable")
    return dict(row)


# ── Favoris ────────────────────────────────────────────────────────
@app.get("/api/favorites/{user_id}")
def list_favorites_legacy(user_id: int, authenticated_id: int = Depends(current_user_id)):
    """Route historique conservee, mais protegee par le jeton du proprietaire."""
    if user_id != authenticated_id:
        raise HTTPException(status_code=403, detail="Acces refuse")
    return _list_favorites(user_id)


@app.get("/api/favorites")
def list_favorites(user_id: int = Depends(current_user_id)):
    """Liste les favoris de l'utilisateur authentifie."""
    return _list_favorites(user_id)


def _list_favorites(user_id: int):
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
def add_favorite(data: FavoriteIn, user_id: int = Depends(current_user_id)):
    """Ajoute un favori (sans doublon)."""
    with engine.begin() as conn:
        destination_exists = conn.execute(
            text("SELECT 1 FROM silver.gares WHERE nom_gare = :d"),
            {"d": data.destination},
        ).fetchone()
        if not destination_exists:
            raise HTTPException(status_code=404, detail="Destination introuvable")
        ex = conn.execute(
            text("SELECT id FROM userapp.user_favorites WHERE user_id = :u AND destination = :d"),
            {"u": user_id, "d": data.destination},
        ).fetchone()
        if not ex:
            conn.execute(
                text("INSERT INTO userapp.user_favorites (user_id, destination) VALUES (:u, :d)"),
                {"u": user_id, "d": data.destination},
            )
    return {"ok": True, "favorite": True}


@app.delete("/api/favorites")
def remove_favorite(data: FavoriteIn, user_id: int = Depends(current_user_id)):
    """Retire un favori."""
    with engine.begin() as conn:
        conn.execute(
            text("DELETE FROM userapp.user_favorites WHERE user_id = :u AND destination = :d"),
            {"u": user_id, "d": data.destination},
        )
    return {"ok": True, "favorite": False}
