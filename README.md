<div align="center">

# 🚆 Wandrail

**Le tourisme en train, autrement — plateforme Big Data & IA**

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.110-009688?logo=fastapi&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql&logoColor=white)
![scikit--learn](https://img.shields.io/badge/scikit--learn-1.5-F7931E?logo=scikit-learn&logoColor=white)
![License MIT](https://img.shields.io/badge/License-MIT-yellow)

[🌐 Démo live](https://wandrail-web.onrender.com) · Projet M1 BDIA · Sup de Vinci · RNCP40167

</div>

---

## Architecture

```
SNCF Open Data + DATAtourisme + OpenStreetMap + INSEE
                    │
                    ▼
    Bronze → Silver → Gold → ML → FastAPI → React
```

| Couche | Rôle |
|---|---|
| **Bronze / Silver / Gold** | Extraction, nettoyage, agrégats — PostgreSQL |
| **ML** | K-means (k=14, silhouette 0,324) + KNN cosine |
| **API** | FastAPI + JWT — [`api/`](api/) |
| **Web** | React 18 + Vite + Tailwind + Recharts — [`web/`](web/) |

## Démarrage local

```bash
docker compose up -d
cd api && pip install -r requirements.txt && uvicorn main:app --reload
cd ../web && npm install && npm run dev
```

→ <http://localhost:5173>

## License

[MIT](LICENSE) © 2026 Thilissa Amara
