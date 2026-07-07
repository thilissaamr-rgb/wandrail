"""Charge un dump pg_dump (format plain SQL avec COPY FROM STDIN) vers Supabase.

Deja teste sur wandrail_silver_gold.sql (184k lignes en 12s).

Usage :
    DATABASE_URL="postgresql://..." python scripts/_load_dump_to_supabase.py chemin/dump.sql
"""

from __future__ import annotations

import io
import os
import sys
import time

import psycopg2
from urllib.parse import quote

DUMP_FILE = sys.argv[1] if len(sys.argv) > 1 else "data/dumps/wandrail_national.sql"

url = os.getenv("DATABASE_URL")
if not url:
    print("ERREUR : DATABASE_URL absent")
    sys.exit(1)

conn = psycopg2.connect(url)
conn.autocommit = True
cur = conn.cursor()

statement: list[str] = []
in_copy = False
copy_header: str | None = None
copy_data: list[str] = []
copy_rows = 0
ddl_ok = 0
ddl_errors = 0
started = time.time()


def execute_statement() -> None:
    global ddl_ok, ddl_errors
    sql = "".join(statement).strip()
    statement.clear()
    if not sql:
        return
    try:
        cur.execute(sql)
        ddl_ok += 1
    except psycopg2.Error as e:
        ddl_errors += 1
        msg = str(e)[:140].replace("\n", " ")
        if "already exists" not in msg and "does not exist" not in msg:
            print(f"  ! {msg}")


with open(DUMP_FILE, "r", encoding="utf-8-sig") as f:
    for i, raw in enumerate(f, 1):
        line = raw.rstrip("\n")
        if in_copy:
            if line == r"\.":
                try:
                    cur.copy_expert(copy_header, io.StringIO("\n".join(copy_data) + "\n"))
                    n = len(copy_data)
                    copy_rows += n
                    print(f"    -> {n} lignes copiees ({copy_rows} total)")
                except psycopg2.Error as e:
                    print(f"    ! COPY error: {str(e)[:150]}")
                in_copy = False
                copy_header = None
                copy_data = []
            else:
                copy_data.append(line)
            continue
        stripped = line.strip()
        if not stripped or stripped.startswith("--") or stripped.startswith("\\"):
            continue
        if stripped.upper().startswith("COPY ") and "from stdin" in stripped.lower():
            execute_statement()
            copy_header = stripped.rstrip(";")
            copy_data = []
            in_copy = True
            print(f"  ligne {i}: {copy_header[:90]}")
            continue
        statement.append(line + "\n")
        if stripped.endswith(";"):
            execute_statement()

execute_statement()
elapsed = time.time() - started
print(f"\n== BILAN ==\nDDL OK: {ddl_ok}  Erreurs: {ddl_errors}\nLignes COPY: {copy_rows}\nDuree: {elapsed:.1f}s")

conn.close()
