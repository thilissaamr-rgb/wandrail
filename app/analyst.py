"""
Interface Data Analyst — TrainVoyage PDL
Accès : streamlit run app/analyst.py --server.port 8507
Mot de passe : analyste2024
"""
import streamlit as st
import streamlit.components.v1 as components
import pandas as pd
import numpy as np
import plotly.graph_objects as go
import plotly.express as px
from sqlalchemy import create_engine
import pickle, os, io

st.set_page_config(page_title="Analytics — TrainVoyage PDL", page_icon="📊",
                   layout="wide", initial_sidebar_state="expanded")

# ── Auth ────────────────────────────────────────────────────────
PASSWORD = "analyste2024"
if "analyst_ok" not in st.session_state: st.session_state.analyst_ok = False

if not st.session_state.analyst_ok:
    col = st.columns([1,2,1])[1]
    with col:
        st.markdown("""
        <div style="text-align:center;padding:3rem 0 1.5rem;">
          <div style="font-size:2.5rem;margin-bottom:.5rem;">📊</div>
          <h2 style="font-size:1.6rem;font-weight:800;margin-bottom:.3rem;">Analytics Dashboard</h2>
          <p style="color:#6b7280;font-size:.88rem;">TrainVoyage PDL — Interface Data Analyst</p>
        </div>""", unsafe_allow_html=True)
        with st.form("auth"):
            pw = st.text_input("Mot de passe", type="password", placeholder="Entrez le mot de passe analyste")
            if st.form_submit_button("Accéder au dashboard", type="primary", use_container_width=True):
                if pw == PASSWORD: st.session_state.analyst_ok = True; st.rerun()
                else: st.error("Mot de passe incorrect")
    st.stop()

# ── DB ──────────────────────────────────────────────────────────
@st.cache_resource
def get_engine():
    return create_engine("postgresql://postgres:00000@localhost:5434/tourisme_train")

@st.cache_data(ttl=3600)
def load_gares():
    return pd.read_sql("SELECT * FROM gold.dim_gare ORDER BY score_attractivite DESC", get_engine())

@st.cache_data(ttl=3600)
def load_poi_sample():
    return pd.read_sql("""
        SELECT p.nom, p.categorie, p.commune, p.note_moyenne,
               pe.distance_gare_km, pe.nom_gare
        FROM silver.poi p JOIN silver.poi_enrichi pe ON pe.id_poi=p.id
        WHERE p.latitude IS NOT NULL LIMIT 5000
    """, get_engine())

@st.cache_data(ttl=3600)
def load_clusters():
    return pd.read_sql("SELECT * FROM gold.poi_clusters LIMIT 5000", get_engine())

@st.cache_data(ttl=3600)
def load_recos():
    return pd.read_sql("""
        SELECT r.rang, r.score_reco, r.raison, p.nom as profil,
               g.nom_gare, g.commune, g.score_attractivite, g.nb_poi_5km
        FROM gold.recommandations r
        JOIN gold.dim_profil p ON p.id=r.id_profil
        JOIN gold.dim_gare g ON g.id=r.id_gare
        ORDER BY p.nom, r.rang
    """, get_engine())

@st.cache_data(ttl=3600)
def load_co2():
    try: return pd.read_sql("SELECT * FROM bronze.co2_trajets", get_engine())
    except: return pd.DataFrame()

@st.cache_data(ttl=3600)
def load_profils():
    return pd.read_sql("SELECT * FROM gold.dim_profil", get_engine())

@st.cache_data(ttl=300)
def load_user_stats():
    try:
        users = pd.read_sql("SELECT id, pseudo, ville_depart, created_at FROM userapp.users", get_engine())
        visits = pd.read_sql("SELECT * FROM userapp.user_visits", get_engine())
        revs = pd.read_sql("SELECT * FROM userapp.user_reviews", get_engine())
        favs = pd.read_sql("SELECT * FROM userapp.user_favorites", get_engine())
        return users, visits, revs, favs
    except: return pd.DataFrame(),pd.DataFrame(),pd.DataFrame(),pd.DataFrame()

try:
    gares = load_gares()
    poi = load_poi_sample()
    recos = load_recos()
    profils = load_profils()
except Exception as e:
    st.error(f"❌ Connexion DB échouée : {e}"); st.stop()

# ── CSS ──────────────────────────────────────────────────────────
components.html("""<script>
(function(){var d=window.parent.document;
function lnk(h){if(!d.querySelector('link[href="'+h+'"]')){var l=d.createElement('link');l.rel='stylesheet';l.href=h;d.head.appendChild(l);}}
lnk('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css');
lnk('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap');
})();
</script>""", height=0)

BG="#030712"; CARD="#0f172a"; CARD2="#111827"; BORDER="rgba(255,255,255,0.07)"
BORDER2="rgba(255,255,255,0.12)"; TEXT="#f1f5f9"; TEXT2="#94a3b8"
BLUE="#3b8fd5"; GREEN="#10b981"; PURPLE="#8b5cf6"; ORANGE="#f59e0b"; RED="#ef4444"
SHADOW="0 2px 16px rgba(0,0,0,.5)"

st.markdown(f"""<style>
*,*::before,*::after{{box-sizing:border-box;margin:0;padding:0}}
html,body,[class*="css"]{{font-family:'Plus Jakarta Sans',sans-serif!important}}
[data-testid="stHeader"]{{display:none!important}}
.main .block-container{{padding:0!important;max-width:100%!important}}
body,.main,[data-testid="stAppViewContainer"]{{background:{BG}!important}}
[data-testid="stSidebar"]{{background:#080f1f!important;border-right:1px solid {BORDER}!important}}
[data-testid="stVerticalBlock"]{{gap:0!important}}
.stButton>button{{border-radius:10px!important;font-family:'Plus Jakarta Sans',sans-serif!important;
  font-weight:600!important;font-size:.83rem!important;border:1.5px solid {BORDER2}!important;
  background:{CARD}!important;color:{TEXT}!important;padding:8px 16px!important;transition:all .15s!important}}
.stButton>button:hover{{border-color:{BLUE}!important;color:{BLUE}!important}}
.stButton>button[kind="primary"]{{background:linear-gradient(135deg,{BLUE},#1b6ca8)!important;color:#fff!important;border-color:transparent!important}}
.stSelectbox>div>div{{background:{CARD}!important;border:1.5px solid {BORDER2}!important;color:{TEXT}!important;border-radius:10px!important}}
.stSelectbox label,.stMultiSelect label{{color:{TEXT2}!important;font-size:.78rem!important}}
.stMultiSelect>div>div{{background:{CARD}!important;border:1.5px solid {BORDER2}!important;border-radius:10px!important}}
.stTextInput>div>div>input{{background:{CARD}!important;border:1.5px solid {BORDER2}!important;color:{TEXT}!important;border-radius:10px!important}}
.stTextInput label{{color:{TEXT2}!important;font-size:.78rem!important}}
.stDataFrame{{background:{CARD}!important;border-radius:12px!important;border:1px solid {BORDER}!important}}
.stTabs [data-baseweb="tab-list"]{{background:{CARD2}!important;border-radius:12px!important;padding:3px!important;border:1px solid {BORDER}!important}}
.stTabs [data-baseweb="tab"]{{border-radius:9px!important;color:{TEXT2}!important;font-weight:600!important;font-size:.82rem!important}}
.stTabs [aria-selected="true"]{{background:linear-gradient(135deg,{BLUE},#1b6ca8)!important;color:#fff!important}}
.stTabs [data-baseweb="tab-panel"]{{padding:0!important}}
.stSlider>div>div>div>div{{background:{BLUE}!important}}
.stSlider label{{color:{TEXT}!important;font-size:.82rem!important}}
.kpi-card{{background:{CARD};border:1px solid {BORDER};border-radius:14px;padding:1.2rem;box-shadow:{SHADOW}}}
.kpi-val{{font-size:2rem;font-weight:900;letter-spacing:-.05em;line-height:1}}
.kpi-lbl{{font-size:.72rem;color:{TEXT2};margin-top:5px;font-weight:500}}
.kpi-delta{{font-size:.72rem;margin-top:4px;font-weight:600}}
.sect-h{{font-size:1.2rem;font-weight:800;color:{TEXT};letter-spacing:-.03em;margin-bottom:3px}}
.sect-sub{{font-size:.78rem;color:{TEXT2};margin-bottom:1rem}}
.badge-row{{display:flex;align-items:center;gap:8px;padding:.7rem 1rem;border-radius:10px;margin-bottom:.4rem}}
.metric-pill{{display:inline-flex;align-items:center;gap:6px;background:{CARD2};border:1px solid {BORDER};
  border-radius:20px;padding:4px 12px;font-size:.72rem;color:{TEXT2};font-weight:500}}
</style>""", unsafe_allow_html=True)

def fi(cls, col="#fff", sz="1rem"):
    return f'<i class="{cls}" style="color:{col};font-size:{sz};"></i>'

def chart_layout(title="", h=320):
    return dict(title=dict(text=title,font=dict(color=TEXT,size=12,family="Plus Jakarta Sans")),
                height=h, showlegend=True, plot_bgcolor=CARD, paper_bgcolor=CARD,
                font=dict(family="Plus Jakarta Sans",color=TEXT2),
                legend=dict(bgcolor="rgba(0,0,0,0)",font=dict(color=TEXT2,size=10)),
                margin=dict(l=10,r=10,t=40,b=10),
                xaxis=dict(showgrid=True,gridcolor=BORDER,color=TEXT2,zeroline=False),
                yaxis=dict(showgrid=True,gridcolor=BORDER,color=TEXT2,zeroline=False))

# ── SIDEBAR ──────────────────────────────────────────────────────
with st.sidebar:
    st.markdown(f"""<div style="padding:.6rem 0 1rem;">
      <div style="font-size:1rem;font-weight:800;color:{TEXT};">{fi("fa-solid fa-chart-mixed",BLUE,"0.9rem")} Analytics</div>
      <div style="font-size:.7rem;color:{TEXT2};margin-top:2px;">TrainVoyage PDL</div>
    </div>""", unsafe_allow_html=True)
    st.markdown(f"<hr style='border:none;border-top:1px solid {BORDER};margin:.3rem 0 .8rem;'>", unsafe_allow_html=True)
    PAGES = {
        "Vue d'ensemble":"fa-solid fa-gauge-high",
        "Modèles ML":"fa-solid fa-brain",
        "Destinations":"fa-solid fa-map-location-dot",
        "POI & Clusters":"fa-solid fa-layer-group",
        "Recommandations":"fa-solid fa-wand-magic-sparkles",
        "Utilisateurs":"fa-solid fa-users",
        "Qualité données":"fa-solid fa-shield-check",
        "Exports":"fa-solid fa-file-export",
    }
    if "a_page" not in st.session_state: st.session_state.a_page = "Vue d'ensemble"
    for pg, ico in PAGES.items():
        active = st.session_state.a_page == pg
        if st.button(f"  {pg}", key=f"ap_{pg}", use_container_width=True,
                     type="primary" if active else "secondary"):
            st.session_state.a_page = pg; st.rerun()
    st.markdown(f"<hr style='border:none;border-top:1px solid {BORDER};margin:.8rem 0;'>", unsafe_allow_html=True)
    if st.button("🔒 Déconnexion", use_container_width=True):
        st.session_state.analyst_ok = False; st.rerun()
    st.markdown(f"<div style='font-size:.65rem;color:{TEXT2};margin-top:.5rem;text-align:center;'>Mode Analyste</div>", unsafe_allow_html=True)

page = st.session_state.a_page

# ══════════════════════════════════════════════════════════════════
# PAGE : VUE D'ENSEMBLE
# ══════════════════════════════════════════════════════════════════
if page == "Vue d'ensemble":
    st.markdown(f"""<div style="background:linear-gradient(135deg,#0a1628,#0f2044);padding:2rem 2.5rem;border-bottom:1px solid {BORDER};">
      <h1 style="color:{TEXT};font-size:1.8rem;font-weight:900;margin:0;letter-spacing:-.04em;">{fi("fa-solid fa-gauge-high",BLUE,"1.4rem")} Vue d'ensemble</h1>
      <p style="color:{TEXT2};margin-top:5px;font-size:.84rem;">Tableau de bord principal · Données temps réel</p>
    </div>""", unsafe_allow_html=True)

    nb_gares = len(gares)
    poi_total = pd.read_sql("SELECT COUNT(*) as n FROM silver.poi", get_engine()).iloc[0]['n']
    score_moy = float(gares['score_attractivite'].mean()) if len(gares)>0 else 0
    nb_profils = len(profils)
    nb_recos = len(recos)

    st.markdown('<div style="max-width:1400px;margin:0 auto;padding:1.5rem 2.5rem;">', unsafe_allow_html=True)
    k1,k2,k3,k4,k5 = st.columns(5)
    for col,val,lbl,ico,c in [
        (k1,nb_gares,"Gares SNCF","fa-solid fa-train",BLUE),
        (k2,f"{int(poi_total):,}","POI indexés","fa-solid fa-map-pin",GREEN),
        (k3,f"{score_moy:.2f}/10","Score IA moyen","fa-solid fa-star",ORANGE),
        (k4,nb_profils,"Profils voyageurs","fa-solid fa-users",PURPLE),
        (k5,nb_recos,"Recommandations","fa-solid fa-brain",RED),
    ]:
        with col:
            st.markdown(f"""<div class="kpi-card">
              <div style="font-size:1.4rem;margin-bottom:7px;">{fi(ico,c,"1.4rem")}</div>
              <div class="kpi-val" style="color:{c};">{val}</div>
              <div class="kpi-lbl">{lbl}</div>
            </div>""", unsafe_allow_html=True)

    st.markdown('<div style="height:1.5rem;"></div>', unsafe_allow_html=True)
    ch1, ch2 = st.columns(2)

    with ch1:
        st.markdown(f"<div class='sect-h'>{fi('fa-solid fa-chart-bar',BLUE,'0.85rem')} Distribution des scores IA</div>"
                    f"<div class='sect-sub'>Score d'attractivité par gare (gold.dim_gare)</div>", unsafe_allow_html=True)
        fig = go.Figure()
        fig.add_trace(go.Histogram(x=gares['score_attractivite'].dropna(), nbinsx=30,
            marker_color=BLUE, marker_line_color=CARD, marker_line_width=1, opacity=0.85, name="Gares"))
        fig.update_layout(**chart_layout("Distribution des scores d'attractivité", 300))
        st.plotly_chart(fig, use_container_width=True)

    with ch2:
        st.markdown(f"<div class='sect-h'>{fi('fa-solid fa-chart-pie',PURPLE,'0.85rem')} Profils touristiques</div>"
                    f"<div class='sect-sub'>Répartition des types de destinations</div>", unsafe_allow_html=True)
        if 'profil_touristique' in gares.columns:
            pt = gares['profil_touristique'].dropna().value_counts().head(8)
            fig2 = go.Figure(go.Pie(labels=pt.index, values=pt.values, hole=0.55,
                marker_colors=[BLUE,GREEN,PURPLE,ORANGE,RED,"#22d3ee","#a78bfa","#f87171"],
                textfont=dict(size=11,family="Plus Jakarta Sans")))
            fig2.update_layout(**chart_layout("Profils touristiques", 300))
            st.plotly_chart(fig2, use_container_width=True)

    ch3, ch4 = st.columns(2)
    with ch3:
        st.markdown(f"<div class='sect-h' style='margin-top:.5rem;'>{fi('fa-solid fa-map-pin',GREEN,'0.85rem')} POI par catégorie</div>"
                    f"<div class='sect-sub'>Répartition (silver.poi)</div>", unsafe_allow_html=True)
        poi_cat = poi['categorie'].dropna().value_counts().head(10)
        CLRS_MAP = {"Hébergement":BLUE,"Restauration":RED,"Culture":PURPLE,"Patrimoine":ORANGE,
                    "Nature":GREEN,"Loisirs":"#ec4899","Sport & Loisirs":"#f97316"}
        fig3 = go.Figure(go.Bar(x=poi_cat.values, y=poi_cat.index, orientation='h',
            marker_color=[CLRS_MAP.get(c,TEXT2) for c in poi_cat.index],
            text=poi_cat.values, textposition="outside",
            textfont=dict(size=10,family="Plus Jakarta Sans",color=TEXT2)))
        l = chart_layout("Catégories POI", 320)
        l['xaxis']['showgrid'] = False; l['yaxis']['showgrid'] = False
        fig3.update_layout(**l)
        st.plotly_chart(fig3, use_container_width=True)

    with ch4:
        st.markdown(f"<div class='sect-h' style='margin-top:.5rem;'>{fi('fa-solid fa-trophy',ORANGE,'0.85rem')} Top 10 destinations</div>"
                    f"<div class='sect-sub'>Score IA le plus élevé</div>", unsafe_allow_html=True)
        top10 = gares.head(10)[['commune','score_attractivite','nb_poi_5km']].dropna()
        fig4 = go.Figure()
        fig4.add_trace(go.Bar(name="Score IA",x=top10['commune'],y=top10['score_attractivite'],
            marker_color=BLUE, yaxis='y', opacity=0.9))
        fig4.add_trace(go.Scatter(name="Nb activités",x=top10['commune'],y=top10['nb_poi_5km'],
            mode='lines+markers', marker_color=GREEN, yaxis='y2',
            line=dict(width=2,color=GREEN), marker=dict(size=6)))
        fig4.update_layout(**{**chart_layout("Top 10 destinations (Score + Activités)", 320),
            "yaxis2":dict(overlaying='y',side='right',color=GREEN,showgrid=False),
            "barmode":"group"})
        st.plotly_chart(fig4, use_container_width=True)
    st.markdown('</div>', unsafe_allow_html=True)

# ══════════════════════════════════════════════════════════════════
# PAGE : MODÈLES ML
# ══════════════════════════════════════════════════════════════════
elif page == "Modèles ML":
    st.markdown(f"""<div style="background:linear-gradient(135deg,#0a1628,#0f2044);padding:2rem 2.5rem;border-bottom:1px solid {BORDER};">
      <h1 style="color:{TEXT};font-size:1.8rem;font-weight:900;margin:0;">{fi("fa-solid fa-brain",PURPLE,"1.4rem")} Modèles Machine Learning</h1>
      <p style="color:{TEXT2};margin-top:5px;font-size:.84rem;">KNN Recommandation · KMeans POI Clustering</p>
    </div>""", unsafe_allow_html=True)
    st.markdown('<div style="max-width:1400px;margin:0 auto;padding:1.5rem 2.5rem;">', unsafe_allow_html=True)

    t1, t2 = st.tabs(["  KNN — Recommandation  ","  KMeans — Clustering POI  "])

    with t1:
        st.markdown('<div style="height:10px;"></div>', unsafe_allow_html=True)
        # Load KNN model info
        knn_path = "models/knn_recommandation.pkl"
        if os.path.exists(knn_path):
            try:
                with open(knn_path,'rb') as f: knn = pickle.load(f)
                m1,m2,m3 = st.columns(3)
                with m1: st.markdown(f"""<div class="kpi-card">
                  <div class="kpi-val" style="color:{PURPLE};">{type(knn).__name__}</div>
                  <div class="kpi-lbl">Algorithme</div></div>""", unsafe_allow_html=True)
                with m2:
                    n_n = getattr(knn,'n_neighbors',5)
                    st.markdown(f"""<div class="kpi-card">
                      <div class="kpi-val" style="color:{BLUE};">{n_n}</div>
                      <div class="kpi-lbl">Voisins (k)</div></div>""", unsafe_allow_html=True)
                with m3:
                    metric = getattr(knn,'metric','euclidean')
                    st.markdown(f"""<div class="kpi-card">
                      <div class="kpi-val" style="color:{GREEN};font-size:1.3rem;">{metric}</div>
                      <div class="kpi-lbl">Distance métrique</div></div>""", unsafe_allow_html=True)
                if hasattr(knn,'_fit_X'):
                    st.markdown(f"""<div style="background:{CARD};border:1px solid {BORDER};border-radius:14px;padding:1.2rem;margin-top:1rem;">
                      <div style="font-size:.88rem;font-weight:700;color:{TEXT};margin-bottom:.8rem;">{fi("fa-solid fa-circle-info",BLUE,"0.8rem")} Détails du modèle</div>
                      <div style="display:flex;gap:1rem;flex-wrap:wrap;">
                        <span class="metric-pill">{fi("fa-solid fa-table",TEXT2,"0.7rem")} {knn._fit_X.shape[0]} observations</span>
                        <span class="metric-pill">{fi("fa-solid fa-columns",TEXT2,"0.7rem")} {knn._fit_X.shape[1]} features</span>
                        <span class="metric-pill">{fi("fa-solid fa-brain",PURPLE,"0.7rem")} sklearn v{knn.__class__.__module__}</span>
                      </div></div>""", unsafe_allow_html=True)
            except Exception as e:
                st.warning(f"Modèle KNN chargé mais erreur : {e}")
        else:
            st.info(f"Modèle non trouvé : {knn_path}")

        st.markdown('<div style="height:1rem;"></div>', unsafe_allow_html=True)
        st.markdown(f"<div class='sect-h'>{fi('fa-solid fa-chart-column',BLUE,'0.85rem')} Recommandations par profil</div>"
                    f"<div class='sect-sub'>Scores de recommandation issus de gold.recommandations</div>", unsafe_allow_html=True)
        for profil in recos['profil'].unique():
            df_p = recos[recos['profil']==profil].sort_values('rang')
            fig = go.Figure(go.Bar(
                x=df_p['commune'], y=df_p['score_reco'],
                marker_color=[BLUE,GREEN,PURPLE,ORANGE,RED][:len(df_p)],
                text=df_p['score_reco'].apply(lambda x:f"{x:.2f}"), textposition="outside",
                textfont=dict(size=10,family="Plus Jakarta Sans",color=TEXT2)))
            fig.update_layout(**chart_layout(f"Profil {profil} — Top 5 destinations KNN", 240))
            st.plotly_chart(fig, use_container_width=True)

    with t2:
        st.markdown('<div style="height:10px;"></div>', unsafe_allow_html=True)
        km_path = "models/kmeans_poi.pkl"
        if os.path.exists(km_path):
            try:
                with open(km_path,'rb') as f: km = pickle.load(f)
                n_clusters = km.n_clusters
                inertia = getattr(km,'inertia_',0)
                m1,m2,m3 = st.columns(3)
                with m1: st.markdown(f"""<div class="kpi-card">
                  <div class="kpi-val" style="color:{BLUE};">{n_clusters}</div>
                  <div class="kpi-lbl">Clusters POI</div></div>""", unsafe_allow_html=True)
                with m2: st.markdown(f"""<div class="kpi-card">
                  <div class="kpi-val" style="color:{GREEN};font-size:1.4rem;">{inertia:,.0f}</div>
                  <div class="kpi-lbl">Inertie</div></div>""", unsafe_allow_html=True)
                with m3: st.markdown(f"""<div class="kpi-card">
                  <div class="kpi-val" style="color:{PURPLE};">{getattr(km,'n_iter_','—')}</div>
                  <div class="kpi-lbl">Itérations</div></div>""", unsafe_allow_html=True)
            except Exception as e:
                st.warning(f"Modèle KMeans chargé mais erreur : {e}")
        else:
            st.info(f"Modèle non trouvé : {km_path}")

        try:
            clusters_df = load_clusters()
            if 'cluster' in clusters_df.columns and len(clusters_df)>0:
                c_count = clusters_df['cluster'].value_counts().sort_index()
                fig_k = go.Figure(go.Bar(x=[f"Cluster {i}" for i in c_count.index],
                    y=c_count.values, marker_color=[BLUE,GREEN,PURPLE,ORANGE,RED,"#22d3ee"][:len(c_count)],
                    text=c_count.values, textposition="outside",
                    textfont=dict(size=10,color=TEXT2,family="Plus Jakarta Sans")))
                fig_k.update_layout(**chart_layout("Répartition des POI par cluster", 280))
                st.plotly_chart(fig_k, use_container_width=True)
        except: pass

    st.markdown('</div>', unsafe_allow_html=True)

# ══════════════════════════════════════════════════════════════════
# PAGE : DESTINATIONS
# ══════════════════════════════════════════════════════════════════
elif page == "Destinations":
    st.markdown(f"""<div style="background:linear-gradient(135deg,#0a1628,#0f2044);padding:2rem 2.5rem;border-bottom:1px solid {BORDER};">
      <h1 style="color:{TEXT};font-size:1.8rem;font-weight:900;margin:0;">{fi("fa-solid fa-map-location-dot",GREEN,"1.4rem")} Analyse Destinations</h1>
      <p style="color:{TEXT2};margin-top:5px;font-size:.84rem;">{len(gares)} gares · gold.dim_gare</p>
    </div>""", unsafe_allow_html=True)
    st.markdown('<div style="max-width:1400px;margin:0 auto;padding:1.5rem 2.5rem;">', unsafe_allow_html=True)

    fc1,fc2,fc3 = st.columns([3,2,2])
    with fc1: q = st.text_input("Rechercher",placeholder="Commune, département...",key="an_q")
    with fc2: dept_list=["Tous"]+sorted(gares['departement'].dropna().unique().tolist()); dept=st.selectbox("Département",dept_list)
    with fc3: score_range=st.slider("Score min",0.0,10.0,(0.0,10.0),key="an_sc")

    df_g = gares.copy()
    if q: df_g = df_g[df_g['commune'].str.lower().str.contains(q.lower(),na=False)|df_g['nom_gare'].str.lower().str.contains(q.lower(),na=False)]
    if dept != "Tous": df_g = df_g[df_g['departement']==dept]
    df_g = df_g[(df_g['score_attractivite']>=score_range[0])&(df_g['score_attractivite']<=score_range[1])]

    st.markdown(f"<div style='font-size:.78rem;color:{TEXT2};margin-bottom:1rem;'>{fi('fa-solid fa-filter',TEXT2,'0.7rem')} {len(df_g)} résultats</div>", unsafe_allow_html=True)

    c_sc,c_box = st.columns(2)
    with c_sc:
        fig = go.Figure(go.Scatter(
            x=df_g['score_attractivite'], y=df_g['nb_poi_5km'],
            mode='markers', text=df_g['commune'],
            marker=dict(color=df_g['score_attractivite'],colorscale='Blues',size=8,opacity=0.8,
                       showscale=True,colorbar=dict(title="Score",tickfont=dict(color=TEXT2,size=9))),
            hovertemplate="<b>%{text}</b><br>Score: %{x:.2f}<br>Activités: %{y}<extra></extra>"))
        fig.update_layout(**chart_layout("Score IA vs Nb activités (5 km)", 320))
        st.plotly_chart(fig, use_container_width=True)
    with c_box:
        if 'departement' in df_g.columns:
            dep_agg = df_g.groupby('departement')['score_attractivite'].agg(['mean','count','std']).reset_index()
            dep_agg.columns=['departement','score_moy','nb_gares','score_std']
            dep_agg = dep_agg.sort_values('score_moy',ascending=False)
            fig2 = go.Figure()
            fig2.add_trace(go.Bar(name="Score moyen",x=dep_agg['departement'],y=dep_agg['score_moy'],
                marker_color=BLUE,opacity=0.85,text=dep_agg['score_moy'].apply(lambda x:f"{x:.2f}"),textposition="outside",
                textfont=dict(size=10,color=TEXT2,family="Plus Jakarta Sans")))
            fig2.update_layout(**chart_layout("Score moyen par département", 320))
            st.plotly_chart(fig2, use_container_width=True)

    st.markdown(f"<div class='sect-h' style='margin-top:.5rem;'>{fi('fa-solid fa-table',BLUE,'0.85rem')} Données complètes</div>", unsafe_allow_html=True)
    cols_show=['commune','departement','score_attractivite','profil_touristique','nb_poi_5km','nb_categories']
    cols_ok=[c for c in cols_show if c in df_g.columns]
    st.dataframe(df_g[cols_ok].rename(columns={
        'commune':'Commune','departement':'Département','score_attractivite':'Score IA',
        'profil_touristique':'Profil','nb_poi_5km':'Activités 5km','nb_categories':'Catégories'
    }).head(100), use_container_width=True, height=380)
    st.markdown('</div>', unsafe_allow_html=True)

# ══════════════════════════════════════════════════════════════════
# PAGE : POI & CLUSTERS
# ══════════════════════════════════════════════════════════════════
elif page == "POI & Clusters":
    st.markdown(f"""<div style="background:linear-gradient(135deg,#0a1628,#0f2044);padding:2rem 2.5rem;border-bottom:1px solid {BORDER};">
      <h1 style="color:{TEXT};font-size:1.8rem;font-weight:900;margin:0;">{fi("fa-solid fa-layer-group",ORANGE,"1.4rem")} POI & Clusters</h1>
      <p style="color:{TEXT2};margin-top:5px;font-size:.84rem;">14 979 points d'intérêt · Clustering KMeans</p>
    </div>""", unsafe_allow_html=True)
    st.markdown('<div style="max-width:1400px;margin:0 auto;padding:1.5rem 2.5rem;">', unsafe_allow_html=True)

    p1,p2 = st.columns(2)
    with p1:
        cat_agg = poi['categorie'].dropna().value_counts()
        CLRS2 = {"Hébergement":BLUE,"Restauration":RED,"Culture":PURPLE,"Patrimoine":ORANGE,
                 "Nature":GREEN,"Loisirs":"#ec4899","Sport & Loisirs":"#f97316"}
        fig=go.Figure(go.Pie(labels=cat_agg.index,values=cat_agg.values,hole=0.5,
            marker_colors=[CLRS2.get(c,TEXT2) for c in cat_agg.index],
            textfont=dict(size=11,family="Plus Jakarta Sans")))
        fig.update_layout(**chart_layout("Répartition par catégorie",300))
        st.plotly_chart(fig,use_container_width=True)
    with p2:
        note_poi = poi[poi['note_moyenne']>0]['note_moyenne'].dropna()
        fig2=go.Figure(go.Histogram(x=note_poi,nbinsx=20,marker_color=GREEN,opacity=0.85))
        fig2.update_layout(**chart_layout("Distribution des notes",300))
        st.plotly_chart(fig2,use_container_width=True)

    poi_gare = poi.groupby('nom_gare').size().reset_index(name='nb_poi').sort_values('nb_poi',ascending=False).head(15)
    fig3=go.Figure(go.Bar(x=poi_gare['nb_poi'],y=poi_gare['nom_gare'],orientation='h',
        marker_color=PURPLE,text=poi_gare['nb_poi'],textposition="outside",
        textfont=dict(size=10,color=TEXT2,family="Plus Jakarta Sans")))
    l3=chart_layout("Top 15 gares par nombre de POI indexés",320)
    l3['xaxis']['showgrid']=False
    fig3.update_layout(**l3)
    st.plotly_chart(fig3,use_container_width=True)

    cat_filter=st.multiselect("Filtrer par catégorie",options=poi['categorie'].dropna().unique().tolist(),
                               default=poi['categorie'].dropna().unique().tolist()[:3])
    if cat_filter:
        poi_f=poi[poi['categorie'].isin(cat_filter)]
        dist_fig=go.Figure()
        for cat in cat_filter:
            d=poi_f[poi_f['categorie']==cat]['distance_gare_km'].dropna()
            dist_fig.add_trace(go.Box(y=d,name=cat,marker_color=CLRS2.get(cat,TEXT2),
                boxpoints='outliers',jitter=0.3,pointpos=-1.8))
        dist_fig.update_layout(**chart_layout("Distance à la gare par catégorie (km)",320))
        st.plotly_chart(dist_fig,use_container_width=True)
    st.markdown('</div>', unsafe_allow_html=True)

# ══════════════════════════════════════════════════════════════════
# PAGE : RECOMMANDATIONS
# ══════════════════════════════════════════════════════════════════
elif page == "Recommandations":
    st.markdown(f"""<div style="background:linear-gradient(135deg,#0a1628,#0f2044);padding:2rem 2.5rem;border-bottom:1px solid {BORDER};">
      <h1 style="color:{TEXT};font-size:1.8rem;font-weight:900;margin:0;">{fi("fa-solid fa-wand-magic-sparkles",BLUE,"1.4rem")} Moteur de Recommandation</h1>
      <p style="color:{TEXT2};margin-top:5px;font-size:.84rem;">KNN · gold.recommandations · 25 recommandations (5 profils × 5 destinations)</p>
    </div>""", unsafe_allow_html=True)
    st.markdown('<div style="max-width:1400px;margin:0 auto;padding:1.5rem 2.5rem;">', unsafe_allow_html=True)

    r1,r2 = st.columns(2)
    with r1:
        PCOLORS={"Famille":BLUE,"Solo":PURPLE,"Couple":"#ec4899","Groupe":ORANGE,"Éco":GREEN}
        fig=go.Figure()
        for prof in recos['profil'].unique():
            df_p=recos[recos['profil']==prof].sort_values('rang')
            fig.add_trace(go.Scatter(x=df_p['rang'],y=df_p['score_reco'],mode='lines+markers',
                name=prof,line=dict(color=PCOLORS.get(prof,TEXT2),width=2),
                marker=dict(size=7,color=PCOLORS.get(prof,TEXT2)),
                text=df_p['commune'],hovertemplate="<b>%{text}</b><br>Rang %{x} · Score %{y:.3f}<extra></extra>"))
        fig.update_layout(**chart_layout("Score KNN par rang et profil",320))
        st.plotly_chart(fig,use_container_width=True)
    with r2:
        pivot = recos.pivot_table(index='commune',columns='profil',values='score_reco',aggfunc='max').fillna(0)
        fig2=go.Figure(go.Heatmap(z=pivot.values,x=pivot.columns,y=pivot.index,
            colorscale='Blues',showscale=True,
            hovertemplate="Profil: %{x}<br>Ville: %{y}<br>Score: %{z:.3f}<extra></extra>",
            colorbar=dict(tickfont=dict(color=TEXT2,size=9))))
        fig2.update_layout(**chart_layout("Heatmap scores par ville × profil",320))
        st.plotly_chart(fig2,use_container_width=True)

    st.markdown(f"<div class='sect-h'>{fi('fa-solid fa-table',BLUE,'0.85rem')} Détail des recommandations</div>", unsafe_allow_html=True)
    prof_sel=st.selectbox("Profil",recos['profil'].unique())
    df_rp=recos[recos['profil']==prof_sel].sort_values('rang')
    for _,row in df_rp.iterrows():
        c=PCOLORS.get(prof_sel,BLUE)
        pct=min(100,int(float(row['score_reco'])*10))
        st.markdown(f"""<div style="display:flex;align-items:center;gap:1.2rem;padding:1rem 1.2rem;
          background:{CARD};border:1px solid {BORDER};border-radius:14px;margin-bottom:.6rem;">
          <div style="background:{c}20;border:2px solid {c}40;border-radius:50%;width:38px;height:38px;
            display:flex;align-items:center;justify-content:center;font-size:1rem;font-weight:800;color:{c};flex-shrink:0;">#{int(row['rang'])}</div>
          <div style="flex:1;">
            <div style="font-weight:700;font-size:.9rem;color:{TEXT};">{row['commune']}</div>
            <div style="font-size:.72rem;color:{TEXT2};margin:.3rem 0;">{fi("fa-solid fa-quote-left",TEXT2,"0.65rem")} {row.get('raison','—')}</div>
            <div style="height:4px;background:{BORDER};border-radius:2px;overflow:hidden;">
              <div style="width:{pct}%;height:100%;background:linear-gradient(90deg,{c},{BLUE});border-radius:2px;"></div>
            </div>
          </div>
          <div style="text-align:right;flex-shrink:0;">
            <div style="font-size:1.2rem;font-weight:800;color:{c};">{float(row['score_reco']):.3f}</div>
            <div style="font-size:.65rem;color:{TEXT2};">Score IA</div>
            <div style="font-size:.7rem;color:{TEXT2};">{fi("fa-solid fa-map-pin",TEXT2,"0.65rem")} {int(row.get('nb_poi_5km',0))} activ.</div>
          </div>
        </div>""", unsafe_allow_html=True)
    st.markdown('</div>', unsafe_allow_html=True)

# ══════════════════════════════════════════════════════════════════
# PAGE : UTILISATEURS
# ══════════════════════════════════════════════════════════════════
elif page == "Utilisateurs":
    st.markdown(f"""<div style="background:linear-gradient(135deg,#0a1628,#0f2044);padding:2rem 2.5rem;border-bottom:1px solid {BORDER};">
      <h1 style="color:{TEXT};font-size:1.8rem;font-weight:900;margin:0;">{fi("fa-solid fa-users",GREEN,"1.4rem")} Analyse Utilisateurs</h1>
      <p style="color:{TEXT2};margin-top:5px;font-size:.84rem;">Comptes, voyages, avis, favoris · userapp.*</p>
    </div>""", unsafe_allow_html=True)
    st.markdown('<div style="max-width:1400px;margin:0 auto;padding:1.5rem 2.5rem;">', unsafe_allow_html=True)
    users, visits, revs, favs = load_user_stats()
    if len(users) == 0:
        st.info("Aucun utilisateur inscrit pour l'instant. L'app utilisateur tourne sur le port 8507.")
    else:
        u1,u2,u3,u4 = st.columns(4)
        for col,n,lbl,c in [(u1,len(users),"Utilisateurs",BLUE),(u2,len(visits),"Voyages enregistrés",GREEN),
                            (u3,len(revs),"Avis publiés",ORANGE),(u4,len(favs),"Favoris ajoutés","#ec4899")]:
            with col:
                st.markdown(f"""<div class="kpi-card">
                  <div class="kpi-val" style="color:{c};">{n}</div>
                  <div class="kpi-lbl">{lbl}</div></div>""", unsafe_allow_html=True)
        if len(visits) > 0:
            co2_total = float(visits['co2_saved_kg'].sum())
            top_dest = visits['destination'].value_counts().head(10)
            fig = go.Figure(go.Bar(x=top_dest.values,y=top_dest.index,orientation='h',
                marker_color=BLUE,text=top_dest.values,textposition="outside",
                textfont=dict(size=10,color=TEXT2,family="Plus Jakarta Sans")))
            fig.update_layout(**chart_layout("Destinations les plus visitées",320))
            st.plotly_chart(fig,use_container_width=True)
            st.markdown(f"""<div style="background:{CARD};border:1px solid {BORDER};border-radius:14px;padding:1rem 1.5rem;">
              <b style="color:{TEXT};font-size:.88rem;">{fi("fa-solid fa-leaf",GREEN,"0.8rem")} CO₂ économisé par les utilisateurs</b>
              <div style="font-size:2rem;font-weight:900;color:{GREEN};margin-top:.5rem;">{co2_total:.1f} kg</div>
              <div style="font-size:.75rem;color:{TEXT2};margin-top:.3rem;">= {co2_total/21:.1f} arbres équivalents</div>
            </div>""", unsafe_allow_html=True)
        if len(revs) > 0:
            st.markdown(f"<div class='sect-h' style='margin-top:1rem;'>{fi('fa-solid fa-star',ORANGE,'0.85rem')} Notes moyennes par destination</div>", unsafe_allow_html=True)
            avg_notes=revs.groupby('destination')['rating'].agg(['mean','count']).reset_index()
            avg_notes.columns=['destination','note_moy','nb_avis']
            avg_notes=avg_notes.sort_values('note_moy',ascending=False).head(10)
            fig2=go.Figure(go.Bar(x=avg_notes['destination'],y=avg_notes['note_moy'],
                marker_color=ORANGE,text=avg_notes['note_moy'].apply(lambda x:f"★{x:.1f}"),textposition="outside",
                textfont=dict(size=10,color=TEXT2,family="Plus Jakarta Sans")))
            fig2.update_layout(**{**chart_layout("Notes moyennes /5",280),"yaxis":{"range":[0,5.5],"showgrid":True,"gridcolor":BORDER,"color":TEXT2}})
            st.plotly_chart(fig2,use_container_width=True)
    st.markdown('</div>', unsafe_allow_html=True)

# ══════════════════════════════════════════════════════════════════
# PAGE : QUALITÉ DONNÉES
# ══════════════════════════════════════════════════════════════════
elif page == "Qualité données":
    st.markdown(f"""<div style="background:linear-gradient(135deg,#0a1628,#0f2044);padding:2rem 2.5rem;border-bottom:1px solid {BORDER};">
      <h1 style="color:{TEXT};font-size:1.8rem;font-weight:900;margin:0;">{fi("fa-solid fa-shield-check",GREEN,"1.4rem")} Qualité des Données</h1>
      <p style="color:{TEXT2};margin-top:5px;font-size:.84rem;">Complétude, valeurs nulles, cohérence · Toutes les tables</p>
    </div>""", unsafe_allow_html=True)
    st.markdown('<div style="max-width:1400px;margin:0 auto;padding:1.5rem 2.5rem;">', unsafe_allow_html=True)

    tables = {
        "gold.dim_gare": gares,
        "silver.poi (sample)": poi,
        "gold.recommandations": recos,
    }
    for tname, df in tables.items():
        if len(df) == 0: continue
        null_rates = (df.isnull().sum() / len(df) * 100).sort_values(ascending=False)
        cols_with_nulls = null_rates[null_rates > 0]
        completude = 100 - float(null_rates.mean())
        c_level = GREEN if completude>=90 else (ORANGE if completude>=70 else RED)
        st.markdown(f"""<div style="background:{CARD};border:1px solid {BORDER};border-radius:16px;padding:1.2rem 1.5rem;margin-bottom:1rem;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;">
            <div>
              <div style="font-weight:700;font-size:.95rem;color:{TEXT};">{fi("fa-solid fa-table",BLUE,"0.85rem")} {tname}</div>
              <div style="font-size:.72rem;color:{TEXT2};margin-top:3px;">{len(df):,} lignes · {len(df.columns)} colonnes</div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:1.5rem;font-weight:800;color:{c_level};">{completude:.1f}%</div>
              <div style="font-size:.68rem;color:{TEXT2};">Complétude</div>
            </div>
          </div>
          <div style="height:6px;background:{BORDER};border-radius:3px;margin-bottom:1rem;overflow:hidden;">
            <div style="width:{completude:.0f}%;height:100%;background:{c_level};border-radius:3px;"></div>
          </div>""", unsafe_allow_html=True)
        if len(cols_with_nulls) > 0:
            chips = "".join([f'<span class="metric-pill" style="color:{ORANGE if v<30 else RED};">{fi("fa-solid fa-triangle-exclamation",ORANGE if v<30 else RED,"0.65rem")} {col}: {v:.1f}%</span>'
                             for col,v in cols_with_nulls.head(8).items()])
            st.markdown(f"<div style='display:flex;gap:6px;flex-wrap:wrap;'>{chips}</div>", unsafe_allow_html=True)
        else:
            st.markdown(f"<div style='font-size:.8rem;color:{GREEN};'>{fi('fa-solid fa-circle-check',GREEN,'0.78rem')} Aucune valeur nulle</div>", unsafe_allow_html=True)
        st.markdown("</div>", unsafe_allow_html=True)

    st.markdown(f"<div class='sect-h'>{fi('fa-solid fa-chart-area',BLUE,'0.85rem')} Statistiques descriptives — gold.dim_gare</div>", unsafe_allow_html=True)
    num_cols = gares.select_dtypes(include=[np.number]).columns.tolist()
    if num_cols:
        desc = gares[num_cols].describe().round(3)
        st.dataframe(desc, use_container_width=True, height=260)
    st.markdown('</div>', unsafe_allow_html=True)

# ══════════════════════════════════════════════════════════════════
# PAGE : EXPORTS
# ══════════════════════════════════════════════════════════════════
elif page == "Exports":
    st.markdown(f"""<div style="background:linear-gradient(135deg,#0a1628,#0f2044);padding:2rem 2.5rem;border-bottom:1px solid {BORDER};">
      <h1 style="color:{TEXT};font-size:1.8rem;font-weight:900;margin:0;">{fi("fa-solid fa-file-export",ORANGE,"1.4rem")} Exports de données</h1>
      <p style="color:{TEXT2};margin-top:5px;font-size:.84rem;">Téléchargez les données au format CSV</p>
    </div>""", unsafe_allow_html=True)
    st.markdown('<div style="max-width:1400px;margin:0 auto;padding:1.5rem 2.5rem;">', unsafe_allow_html=True)

    EXPORTS = [
        ("Gares SNCF (dim_gare)", gares, "gares_pdl.csv"),
        ("POI échantillon", poi, "poi_sample.csv"),
        ("Recommandations KNN", recos, "recommandations_knn.csv"),
    ]
    for title, df, filename in EXPORTS:
        c1,c2 = st.columns([4,1])
        with c1:
            st.markdown(f"""<div style="background:{CARD};border:1px solid {BORDER};border-radius:12px;padding:1rem 1.2rem;">
              <div style="font-weight:700;color:{TEXT};font-size:.88rem;">{fi("fa-solid fa-file-csv",GREEN,"0.8rem")} {title}</div>
              <div style="font-size:.72rem;color:{TEXT2};margin-top:3px;">{len(df):,} lignes · {len(df.columns)} colonnes</div>
            </div>""", unsafe_allow_html=True)
        with c2:
            buf = io.BytesIO()
            df.to_csv(buf, index=False, encoding='utf-8-sig')
            st.download_button(f"⬇ {filename}", data=buf.getvalue(),
                             file_name=filename, mime="text/csv",
                             use_container_width=True, type="primary")

    st.markdown(f"<div class='sect-h' style='margin-top:1.5rem;'>{fi('fa-solid fa-cloud',BLUE,'0.85rem')} Guide déploiement Supabase + Streamlit Cloud</div>", unsafe_allow_html=True)
    st.markdown(f"""<div style="background:{CARD};border:1px solid {BORDER};border-radius:16px;padding:1.5rem;">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;">
        <div>
          <div style="font-weight:700;color:{BLUE};margin-bottom:.8rem;">1. Supabase (Base de données cloud)</div>
          <div style="font-size:.8rem;color:{TEXT2};line-height:1.7;">
            • Créer un compte sur supabase.com<br>
            • Nouveau projet → copier l'URL de connexion<br>
            • Exporter : <code style="background:{CARD2};padding:2px 6px;border-radius:4px;color:{GREEN};">pg_dump -U postgres -p 5434 tourisme_train > dump.sql</code><br>
            • Importer sur Supabase via l'outil SQL<br>
            • Mettre DATABASE_URL en variable d'env
          </div>
        </div>
        <div>
          <div style="font-weight:700;color:{GREEN};margin-bottom:.8rem;">2. Streamlit Cloud (App gratuite)</div>
          <div style="font-size:.8rem;color:{TEXT2};line-height:1.7;">
            • Pousser le code sur GitHub<br>
            • Aller sur share.streamlit.io<br>
            • Connecter le repo GitHub<br>
            • Sélectionner app/main.py<br>
            • Ajouter DATABASE_URL dans les secrets Streamlit
          </div>
        </div>
      </div></div>""", unsafe_allow_html=True)
    st.markdown('</div>', unsafe_allow_html=True)
