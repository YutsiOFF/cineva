# CINEVA — interface de streaming (React + Vite + Tailwind)

Front-end de streaming inspiré de Netflix / Disney+ : catalogue TMDB, carrousels,
fiches détaillées, recherche, « Ma liste » locale et lecteur vidéo HLS avec
contrôles personnalisés. **100 % statique**, prêt pour GitHub Pages.

> Le site ne contient aucun flux vidéo : il affiche les métadonnées TMDB et lit
> les sources renvoyées par les backends que vous configurez (CinePro Core,
> AutoFlix). Voir « Résolution des flux ».

---

## Stack

| Rôle | Choix |
| --- | --- |
| Framework | React 18 + Vite 5 |
| Langage | TypeScript strict |
| Styles | Tailwind CSS 3 |
| Routage | React Router 6 (`HashRouter`) |
| État global | Zustand (`persist` → localStorage) |
| Lecteur | `hls.js` + `<video>` natif, contrôles custom |
| HTTP | `fetch` natif (aucun client lourd) |

---

## Démarrage

```bash
npm install
cp .env.example .env     # puis renseignez vos variables
npm run dev              # http://localhost:5173
npm run build            # typecheck + build dans dist/
npm run preview          # sert dist/ en local
```

Node 20+ recommandé (le workflow CI utilise Node 20).

---

## Variables d'environnement

Toutes les variables sont **publiques** : elles sont intégrées en clair dans le
bundle (contrainte d'un site statique). Ne mettez jamais de secret ici.

| Variable | Rôle |
| --- | --- |
| `VITE_TMDB_API_KEY` | Clé API TMDB **v3** (32 caractères). Obligatoire. |
| `VITE_TMDB_LANGUAGE` | Langue des métadonnées (`fr-FR` par défaut). |
| `VITE_CINEPRO_API_URL` | Base URL d'une instance CinePro Core (optionnel). |
| `VITE_AUTOFLIX_API_URL` | Base URL d'un service HTTP exposant AutoFlix (optionnel). |
| `VITE_DEMO_STREAM_URL` | Flux HLS/MP4 public de test pour le lecteur (optionnel). |

> La clé fournie dans `.env.example` est une clé v3 de démonstration (publique,
> visible dans le bundle). Pour un site en production, créez la vôtre sur
> <https://www.themoviedb.org/settings/api> et restreignez-la par domaine. Sans
> clé valide, l'accueil affiche un écran de configuration explicite (pas une
> page blanche).

Variables lues **au build** : redémarrez `npm run dev` après modification du
`.env`, et relancez le build avant un déploiement.

---

## Résolution des flux (CinePro / AutoFlix)

GitHub Pages ne peut exécuter ni Node ni Python : la résolution se fait donc via
une **API HTTP distante** appelée depuis le navigateur.

### Contrat attendu

L'application appelle, pour chaque résolveur configuré :

```
GET {BASE}/stream?type=movie&tmdb_id=603
GET {BASE}/stream?type=tv&tmdb_id=1399&season=1&episode=1
```

et attend une réponse de ce type :

```json
{
  "sources": [
    {
      "url": "https://cdn.exemple/master.m3u8",
      "quality": "1080p",
      "language": "VF",
      "provider": "Provider A",
      "subtitles": [
        { "label": "Français", "lang": "fr", "url": "https://cdn.exemple/fr.vtt" }
      ]
    }
  ]
}
```

Le parseur (`src/services/streamResolver.ts`) tolère plusieurs variantes :
`streams`, `links`, `data.sources`, `file`, `src`, `playlist`, `resolution`,
`tracks`… Adaptez **uniquement** `normalizeSources` (ou le chemin dans
`buildStreamEndpoint`) si votre backend expose un autre contrat.

### Comportement

1. Les résolveurs configurés sont interrogés **dans l'ordre** (CinePro puis
   AutoFlix) ; un échec n'empêche pas l'autre de répondre.
2. Les sources sont dédupliquées et triées par qualité (1080p > 720p > Auto).
3. Si `VITE_DEMO_STREAM_URL` est défini et qu'aucune source n'est trouvée, ce
   flux de démonstration est proposé (uniquement pour valider le lecteur).
4. Sinon, la page de lecture affiche un panneau « Aucun flux disponible » avec
   les erreurs remontées et la procédure de configuration — jamais de source
   inventée.

### Exemple de shim HTTP pour AutoFlix

`autoflix-cli` est une CLI/librairie Python : exposez-la derrière un petit
service (hébergé ailleurs que sur GitHub Pages) et autorisez l'origine de votre
site en CORS.

```python
# autoflix_api.py — exemple indicatif, adaptez aux fonctions réelles du paquet
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import autoflix

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://<utilisateur>.github.io"],
    allow_methods=["GET"],
)

@app.get("/stream")
def stream(type: str, tmdb_id: int, season: int = 1, episode: int = 1):
    try:
        sources = autoflix.search_streams(
            tmdb_id=tmdb_id, media_type=type, season=season, episode=episode
        )
    except Exception as exc:  # provider indisponible, titre introuvable…
        raise HTTPException(status_code=502, detail=str(exc))
    return {"sources": sources}
```

```bash
uvicorn autoflix_api:app --host 0.0.0.0 --port 8000
```

CinePro Core s'expose de la même manière : pointez `VITE_CINEPRO_API_URL` vers
l'instance et vérifiez que la route de résolution et le CORS correspondent.

### Lecteur

- HLS via `hls.js` avec récupération automatique (réseau / média), bascule sur
  le HLS natif Safari.
- MP4/WebM en `<video>` natif, embeds en iframe.
- Contrôles custom : lecture, ±10 s, volume, qualité (niveaux HLS), pistes de
  sous-titres (intégrées ou externes `.vtt`), PiP, plein écran.
- Raccourcis clavier : `Espace`/`K`, `←`/`→` (±5 s), `↑`/`↓` (volume), `M`, `F`.

---

## Déploiement sur GitHub Pages

1. Poussez le projet sur GitHub (branche `main`).
2. **Settings → Pages → Source : Deploy from a branch → `gh-pages` / `/ (root)`**.
3. Le workflow `.github/workflows/deploy.yml` build et publie automatiquement
   `dist/` sur `gh-pages` à chaque push sur `main`.
4. (Optionnel) **Settings → Secrets and variables → Actions** :
   - secret `TMDB_API_KEY` : votre clé TMDB (sinon la clé par défaut est utilisée) ;
   - variable `CINEPRO_API_URL` / `AUTOFLIX_API_URL` : vos résolveurs.

### Base path

`vite.config.ts` lit `BASE_PATH` (défini dans le workflow à
`/<nom-du-repo>/`) : les assets pointent automatiquement vers
`https://<user>.github.io/<repo>/`. En local, `BASE_PATH` est vide → `/`.

### HashRouter

Les URLs sont de la forme `https://<user>.github.io/<repo>/#/film/603`. Aucun
rewrite serveur n'est nécessaire, un rafraîchissement ou un partage de lien
fonctionne directement.

---

## Arborescence

```
.github/workflows/deploy.yml   Build + publication sur gh-pages
index.html                     Entrée HTML, polices, favicon
src/
├── App.tsx                    Routes (lazy) + ScrollToTop
├── main.tsx                   HashRouter + StrictMode
├── index.css                  Tailwind, thème, styles du lecteur
├── components/
│   ├── layout/                Header, ProfileMenu, Footer, AppLayout
│   ├── media/                 HeroBanner, MediaRow, MediaCard, MediaGrid, TrailerModal
│   ├── player/                VideoPlayer (HLS), SourceList
│   └── ui/                    Icônes, Skeleton, ErrorState, Logo, PosterImage
├── config/rows.ts             Rangées de l'accueil (une entrée = une rangée)
├── hooks/                     useAsync (annulable), useDebouncedValue
├── lib/                       cn(), formatage FR
├── pages/                     Home, Detail, Search, MyList, Watch, NotFound
├── services/
│   ├── tmdb.ts                Client TMDB typé, cache 5 min, erreurs FR
│   └── streamResolver.ts      Résolveurs CinePro/AutoFlix + normalisation
├── store/myList.ts            Zustand + persist (localStorage)
└── types/media.ts             Types métier partagés
```

Ajouter une rangée d'accueil = ajouter une entrée dans `src/config/rows.ts`.

---

## Qualité & limites

- Responsive mobile → desktop, images `loading="lazy"`, code splitting par route,
  squelettes de chargement, erreurs localisées par rangée, `aria-label` sur les
  contrôles du lecteur, navigation clavier, `prefers-reduced-motion`.
- Clé TMDB : publique par conception (appel navigateur), à restreindre par
  domaine dans le tableau de bord TMDB.
- Les flux affichés dépendent des backends que vous connectez ; l'usage de
  sources non autorisées relève de votre responsabilité.
- Pas de compte utilisateur : « Ma liste » vit dans le localStorage.
