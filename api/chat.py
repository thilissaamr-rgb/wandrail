"""Chatbot Wandrail — répond aux questions en interrogeant la base.

Intent detection par mots-clés (pas de LLM externe).
Renvoie des réponses structurées avec données réelles.
"""
import re
from sqlalchemy import text


def answer(question: str, engine) -> dict:
    q = question.lower().strip()

    # ── Intent: stats globales ──
    if any(w in q for w in ["combien", "statistique", "chiffre", "nombre", "stats"]):
        if any(w in q for w in ["gare", "train", "station"]):
            return _count_gares(engine)
        if any(w in q for w in ["poi", "lieu", "point", "touristique", "visiter"]):
            return _count_poi(engine)
        if any(w in q for w in ["département", "departement", "region"]):
            return _count_deps(engine)
        if any(w in q for w in ["mobilité", "mobilite", "bus", "vélo", "velo", "tram"]):
            return _count_mobilites(engine)
        return _stats_globales(engine)

    # ── Intent: chercher une destination ──
    if any(w in q for w in ["cherche", "trouve", "destination", "où aller", "ou aller",
                             "recommande", "conseil", "suggestion", "voyage",
                             "visiter", "aller", "partir", "vacance", "week-end",
                             "weekend", "escapade", "decouvrir", "découvrir",
                             "je veux", "j'aimerais", "envie de"]):
        ville = _detect_ville(q, engine)
        if ville:
            return _info_ville(engine, ville)
        theme = _detect_theme(q)
        if theme:
            return _search_by_theme(engine, theme)
        dept = _detect_dept(q)
        if dept:
            return _search_by_dept(engine, dept)
        return _top_destinations(engine)

    # ── Intent: info sur une ville/gare ──
    ville = _detect_ville(q, engine)
    if ville:
        return _info_ville(engine, ville)

    # ── Intent: CO2 / carbone / écologie ──
    if any(w in q for w in ["co2", "carbone", "écologi", "ecologi", "climat",
                             "emission", "émission", "vert", "environnement"]):
        return _co2_info(engine)

    # ── Intent: catégories ──
    if any(w in q for w in ["catégorie", "categorie", "type de lieu", "quoi visiter"]):
        return _categories(engine)

    # ── Intent: aide / bonjour ──
    if any(w in q for w in ["bonjour", "salut", "hello", "hi", "coucou"]):
        return _reply("Bonjour ! Je suis l'assistant Wandrail. Posez-moi une question sur les destinations, le CO₂, les catégories de lieux, ou demandez-moi des statistiques.")

    if any(w in q for w in ["aide", "help", "comment ça marche", "comment ca marche",
                             "tu fais quoi", "tu sais faire"]):
        return _reply(
            "Je peux vous aider avec :\n"
            "• **Destinations** — « Où aller en Bretagne ? », « Trouve-moi une destination nature »\n"
            "• **Statistiques** — « Combien de gares ? », « Combien de POI ? »\n"
            "• **CO₂** — « Quel impact carbone ? »\n"
            "• **Info ville** — Tapez un nom de ville (ex: « Nantes », « Lyon »)\n"
            "• **Catégories** — « Quelles catégories de lieux ? »"
        )

    # ── Fallback: essayer comme nom de ville ──
    ville = _fuzzy_ville(q, engine)
    if ville:
        return _info_ville(engine, ville)

    return _reply("Je n'ai pas compris votre question. Essayez : « Où aller en Bretagne ? », « Combien de gares ? », ou tapez un nom de ville.")


# ── Helpers ──

def _reply(text_msg, data=None):
    r = {"message": text_msg}
    if data:
        r["data"] = data
    return r


def _count_gares(engine):
    with engine.connect() as c:
        n = c.execute(text("SELECT COUNT(*) FROM silver.gares")).scalar()
    return _reply(f"Wandrail référence **{n:,} gares** sur l'ensemble du réseau ferroviaire français.".replace(",", " "))


def _count_poi(engine):
    with engine.connect() as c:
        n = c.execute(text("SELECT COUNT(*) FROM silver.poi")).scalar()
    return _reply(f"La base contient **{n:,} points d'intérêt** touristiques (hébergements, restaurants, culture, nature…).".replace(",", " "))


def _count_deps(engine):
    with engine.connect() as c:
        n = c.execute(text("SELECT COUNT(DISTINCT departement) FROM silver.gares")).scalar()
    return _reply(f"Les données couvrent **{n} départements** français.")


def _count_mobilites(engine):
    with engine.connect() as c:
        rows = c.execute(text(
            "SELECT type_mobilite, COUNT(*) FROM silver.mobilites GROUP BY type_mobilite ORDER BY 2 DESC"
        )).fetchall()
    lines = [f"• {r[0]} : {r[1]:,}".replace(",", " ") for r in rows]
    total = sum(r[1] for r in rows)
    return _reply(f"**{total:,} stations de mobilité** recensées :\n".replace(",", " ") + "\n".join(lines))


def _stats_globales(engine):
    with engine.connect() as c:
        g = c.execute(text("SELECT COUNT(*) FROM silver.gares")).scalar()
        p = c.execute(text("SELECT COUNT(*) FROM silver.poi")).scalar()
        d = c.execute(text("SELECT COUNT(DISTINCT departement) FROM silver.gares")).scalar()
        m = c.execute(text("SELECT COUNT(*) FROM silver.mobilites")).scalar()
    return _reply(
        f"📊 **Wandrail en chiffres** :\n"
        f"• {g:,} gares\n• {p:,} POI touristiques\n• {d} départements\n• {m:,} stations de mobilité".replace(",", " ")
    )


def _detect_theme(q):
    themes = {
        "nature": "Nature", "plage": "Nature", "mer": "Nature", "montagne": "Nature",
        "forêt": "Nature", "foret": "Nature", "randonnée": "Nature", "randonnee": "Nature",
        "culture": "Culture", "musée": "Culture", "musee": "Culture", "art": "Culture",
        "patrimoine": "Patrimoine", "château": "Patrimoine", "chateau": "Patrimoine",
        "église": "Patrimoine", "eglise": "Patrimoine", "historique": "Patrimoine",
        "restaurant": "Restauration", "manger": "Restauration", "gastronomie": "Restauration",
        "hébergement": "Hebergement", "hebergement": "Hebergement", "hôtel": "Hebergement",
        "hotel": "Hebergement", "dormir": "Hebergement",
        "loisir": "Loisirs", "activité": "Loisirs", "activite": "Loisirs",
        "sport": "Loisirs", "famille": "Loisirs",
    }
    for kw, cat in themes.items():
        if kw in q:
            return cat
    return None


def _detect_dept(q):
    depts = [
        "ain", "aisne", "allier", "alpes", "ardèche", "ardeche", "ardennes",
        "ariège", "ariege", "aube", "aude", "aveyron", "bouches", "calvados",
        "cantal", "charente", "cher", "corrèze", "correze", "corse", "côte",
        "creuse", "dordogne", "doubs", "drôme", "drome", "eure", "finistère",
        "finistere", "gard", "garonne", "gers", "gironde", "hérault", "herault",
        "ille", "indre", "isère", "isere", "jura", "landes", "loir", "loire",
        "loiret", "lot", "lozère", "lozere", "maine", "manche", "marne",
        "mayenne", "meurthe", "meuse", "morbihan", "moselle", "nièvre", "nievre",
        "nord", "oise", "orne", "pas-de-calais", "puy", "pyrénées", "pyrenees",
        "rhin", "rhône", "rhone", "saône", "saone", "sarthe", "savoie",
        "seine", "somme", "tarn", "var", "vaucluse", "vendée", "vendee",
        "vienne", "vosges", "yonne", "essonne", "hauts", "val",
        "bretagne", "normandie", "alsace", "provence", "occitanie",
    ]
    for d in depts:
        if d in q:
            return d
    return None


def _search_by_theme(engine, categorie):
    with engine.connect() as c:
        rows = c.execute(text("""
            SELECT g.nom_gare, g.commune, g.departement, d.score_attractivite,
                   d.nb_poi_5km
            FROM silver.gares g
            JOIN gold.dim_gare d ON d.code_uic = g.code_uic
            WHERE EXISTS (
                SELECT 1 FROM silver.poi_enrichi pe
                JOIN silver.poi p ON p.id = pe.id_poi
                WHERE pe.id_gare_1 = g.id AND p.categorie = :cat
                  AND pe.distance_gare_km <= 5
            )
            ORDER BY d.score_attractivite DESC NULLS LAST
            LIMIT 5
        """), {"cat": categorie}).fetchall()

    if not rows:
        return _reply(f"Je n'ai pas trouvé de destination avec la catégorie « {categorie} ». Essayez un autre thème.")

    lines = [f"• **{r[1]}** ({r[2]}) — score {r[3]:.1f}, {r[4]} POI à 5 km" for r in rows]
    return _reply(
        f"🎯 Top 5 destinations **{categorie}** :\n" + "\n".join(lines),
        [{"nom_gare": r[0], "commune": r[1], "departement": r[2]} for r in rows]
    )


def _search_by_dept(engine, dept):
    with engine.connect() as c:
        rows = c.execute(text("""
            SELECT g.nom_gare, g.commune, g.departement, d.score_attractivite,
                   d.nb_poi_5km
            FROM silver.gares g
            JOIN gold.dim_gare d ON d.code_uic = g.code_uic
            WHERE LOWER(g.departement) LIKE :dept
            ORDER BY d.score_attractivite DESC NULLS LAST
            LIMIT 5
        """), {"dept": f"%{dept}%"}).fetchall()

    if not rows:
        return _reply(f"Aucune gare trouvée dans « {dept} ». Vérifiez l'orthographe du département.")

    lines = [f"• **{r[1]}** — score {r[3]:.1f}, {r[4]} POI à 5 km" for r in rows]
    return _reply(
        f"🚆 Top destinations dans **{rows[0][2]}** :\n" + "\n".join(lines),
        [{"nom_gare": r[0], "commune": r[1]} for r in rows]
    )


def _top_destinations(engine):
    with engine.connect() as c:
        rows = c.execute(text("""
            SELECT g.nom_gare, g.commune, g.departement, d.score_attractivite, d.nb_poi_5km
            FROM silver.gares g
            JOIN gold.dim_gare d ON d.code_uic = g.code_uic
            WHERE d.score_attractivite IS NOT NULL
            ORDER BY d.score_attractivite DESC
            LIMIT 5
        """)).fetchall()

    lines = [f"• **{r[1]}** ({r[2]}) — score {r[3]:.1f}, {r[4]} POI" for r in rows]
    return _reply(
        "🏆 Top 5 destinations Wandrail :\n" + "\n".join(lines) +
        "\n\nPrécisez un département ou un thème (nature, culture, patrimoine…) pour affiner.",
        [{"nom_gare": r[0], "commune": r[1]} for r in rows]
    )


def _detect_ville(q, engine):
    mots = re.findall(r"[a-zàâäéèêëïîôùûüÿç\-]+", q)
    villes_kw = {"info", "sur", "parle", "moi", "de", "à", "a", "pour", "dans",
                 "quoi", "est", "ce", "que", "la", "le", "les", "des", "du", "un",
                 "une", "en", "et", "ou", "avec"}
    candidats = [m for m in mots if m not in villes_kw and len(m) > 2]
    if not candidats:
        return None
    for c in reversed(candidats):
        with engine.connect() as conn:
            row = conn.execute(
                text("SELECT nom_gare FROM silver.gares WHERE LOWER(commune) = :c LIMIT 1"),
                {"c": c}
            ).fetchone()
            if row:
                return row[0]
    return None


def _fuzzy_ville(q, engine):
    mots = re.findall(r"[a-zàâäéèêëïîôùûüÿç\-]{3,}", q)
    for m in reversed(mots):
        with engine.connect() as conn:
            row = conn.execute(
                text("SELECT nom_gare FROM silver.gares WHERE LOWER(commune) LIKE :c LIMIT 1"),
                {"c": f"%{m}%"}
            ).fetchone()
            if row:
                return row[0]
    return None


def _info_ville(engine, nom_gare):
    with engine.connect() as c:
        g = c.execute(text("""
            SELECT g.nom_gare, g.commune, g.departement, g.latitude, g.longitude,
                   d.score_attractivite, d.nb_poi_5km, d.nb_categories, d.profil_touristique
            FROM silver.gares g
            LEFT JOIN gold.dim_gare d ON d.code_uic = g.code_uic
            WHERE g.nom_gare = :n LIMIT 1
        """), {"n": nom_gare}).fetchone()

        if not g:
            return _reply(f"Je n'ai pas trouvé la gare « {nom_gare} » dans la base.")

        cats = c.execute(text("""
            SELECT p.categorie, COUNT(*) FROM silver.poi p
            JOIN silver.poi_enrichi pe ON pe.id_poi = p.id
            WHERE pe.nom_gare = :n AND pe.distance_gare_km <= 5
            GROUP BY p.categorie ORDER BY 2 DESC LIMIT 5
        """), {"n": nom_gare}).fetchall()

        mob = c.execute(text("""
            SELECT type_mobilite, COUNT(*) FROM silver.mobilites
            WHERE ABS(latitude - :lat) < 0.05 AND ABS(longitude - :lon) < 0.05
            GROUP BY type_mobilite
        """), {"lat": g[3], "lon": g[4]}).fetchall()

    cat_lines = [f"  • {r[0]} : {r[1]}" for r in cats] if cats else ["  Aucun POI à proximité"]
    mob_lines = [f"  • {r[0]} : {r[1]}" for r in mob] if mob else ["  Pas de données mobilité"]

    score = f"{g[5]:.1f}" if g[5] else "N/A"
    profil = g[8] or "Non classé"

    return _reply(
        f"📍 **{g[1]}** ({g[2]})\n"
        f"Gare : {g[0]}\n"
        f"Score attractivité : **{score}** | Profil : {profil}\n"
        f"POI dans 5 km : **{g[6] or 0}** ({g[7] or 0} catégories)\n\n"
        f"**Top catégories :**\n" + "\n".join(cat_lines) +
        f"\n\n**Mobilité locale :**\n" + "\n".join(mob_lines),
        {"nom_gare": g[0], "commune": g[1]}
    )


def _co2_info(engine):
    with engine.connect() as c:
        g = c.execute(text("SELECT COUNT(*) FROM silver.gares")).scalar()
    eco_kg = round(415 * (218 - 20) / 1000, 1)
    return _reply(
        f"🌱 **Impact carbone du train** :\n"
        f"• Voiture : 218 g CO₂/km (ADEME)\n"
        f"• Train TER : 30 g CO₂/km\n"
        f"• Train TGV : 4 g CO₂/km\n"
        f"• **−91%** d'émissions en moyenne\n\n"
        f"Sur un trajet moyen de 415 km, prendre le train économise **{eco_kg} kg CO₂** par rapport à la voiture.\n"
        f"Avec {g:,} gares desservies, le potentiel est immense.".replace(",", " ")
    )


def _categories(engine):
    with engine.connect() as c:
        rows = c.execute(text(
            "SELECT categorie, COUNT(*) FROM silver.poi GROUP BY categorie ORDER BY 2 DESC"
        )).fetchall()
    lines = [f"• **{r[0]}** : {r[1]:,}".replace(",", " ") for r in rows]
    return _reply("📋 **Catégories de lieux touristiques** :\n" + "\n".join(lines))
