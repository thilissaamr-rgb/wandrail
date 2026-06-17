"""
DAG Airflow — Pipeline Tourisme en Train (Pays de la Loire)
Architecture Médaillon : Bronze → Silver → Gold → ML
"""

from airflow import DAG
from airflow.operators.python import PythonOperator
from datetime import datetime, timedelta
import subprocess

default_args = {
    'owner'      : 'tourisme_train',
    'retries'    : 1,
    'retry_delay': timedelta(minutes=5),
}

dag = DAG(
    'tourisme_train_pipeline',
    default_args=default_args,
    description='Pipeline Médaillon — Tourisme en Train PDL (Bronze→Silver→Gold→ML)',
    schedule_interval='@weekly',
    start_date=datetime(2026, 1, 1),
    catchup=False,
    tags=['tourisme', 'sncf', 'medaillon', 'ml', 'gold'],
)

def run(script):
    """Lance un script Python avec gestion d'erreur."""
    subprocess.run(
        ["python", f"/opt/airflow/scripts/{script}"],
        check=True,
        env={**__import__('os').environ,
             'PYTHONIOENCODING': 'utf-8'}
    )

# Définition des tâches
t0 = PythonOperator(task_id='init_database',          python_callable=lambda: run('00_init_db.py'),           dag=dag)
t1 = PythonOperator(task_id='extract_gares_bronze',   python_callable=lambda: run('01_gares.py'),             dag=dag)
t2 = PythonOperator(task_id='extract_poi_bronze',     python_callable=lambda: run('02_datatourisme.py'),      dag=dag)
t3 = PythonOperator(task_id='extract_mobilites',      python_callable=lambda: run('03_mobilites.py'),         dag=dag)
t4 = PythonOperator(task_id='enrichissement_silver',  python_callable=lambda: run('04_enrichissement.py'),    dag=dag)
t5 = PythonOperator(task_id='gold_layer',             python_callable=lambda: run('05_gold_layer.py'),        dag=dag)
t6 = PythonOperator(task_id='ml_clustering',          python_callable=lambda: run('06_ml_clustering.py'),     dag=dag)
t7 = PythonOperator(task_id='ml_recommandation',      python_callable=lambda: run('07_ml_recommandation.py'), dag=dag)

# ─────────────────────────────────────────────────────────────
# Ordre d'exécution (Architecture Médaillon)
#
#  t0 (init DB)
#    ↓
#  t1 (gares) ─────────┐
#  t2 (POI)    ────────┤  → t4 (enrichissement Silver)
#  t3 (mobilités) ─────┘         ↓
#                             t5 (Gold layer)
#                            ↙           ↘
#                    t6 (clustering)   t7 (recommandation)
# ─────────────────────────────────────────────────────────────
t0 >> [t1, t2, t3] >> t4 >> t5 >> [t6, t7]
