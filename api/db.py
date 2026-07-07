"""Connexion a la base PostgreSQL / Supabase.

La valeur reelle vient du fichier .env (jamais commite) ou des variables
d'environnement du service cloud (Render, Railway, etc.).
"""
import os

from dotenv import load_dotenv
from sqlalchemy import create_engine

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    DATABASE_URL = "postgresql://postgres:00000@localhost:5434/tourisme_train"

# Auto-detect driver: psycopg v3 on Render, psycopg2 local
try:
    import psycopg  # noqa: F401
    _driver = "psycopg"
except ImportError:
    _driver = "psycopg2"

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = f"postgresql+{_driver}://" + DATABASE_URL[len("postgres://"):]
elif DATABASE_URL.startswith("postgresql://") and "+" not in DATABASE_URL.split("://")[0]:
    DATABASE_URL = f"postgresql+{_driver}://" + DATABASE_URL[len("postgresql://"):]

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=1800,
    pool_size=5,
    max_overflow=10,
)
