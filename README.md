# CINEVA — interface de streaming (React + Vite + Tailwind)

Front-end de streaming inspiré de Netflix / Disney+ : catalogue TMDB, carrousels,
fiches détaillées, recherche, « Ma liste » locale, **où regarder légalement** et
lecteur vidéo HLS avec contrôles personnalisés. **100 % statique**, déployé sur
GitHub Pages.

- Site : <https://yutsioff.github.io/cineva/>
- Dépôt : <https://github.com/YutsiOFF/cineva>

> Le site n'héberge, ne stocke et ne fabrique aucun flux vidéo. La lecture utilise
> les fichiers que vous déclarez dans `public/streams.json` ; la disponibilité des
> titres provient de Watchmode et de Streaming Availability (Movie of the Night),
> avec des liens vers les plateformes officielles.

---

## Ce qui fonctionne

| Fonction | État |
| --- | --- |
| Catalogue TMDB (accueil, rangées, fiches, saisons, recherche) | ✅ en ligne |
| « Ma liste » (localStorage) | ✅ |
| Lecteur HLS/MP4 + contrôles custom | ✅ testé avec un flux public |
| Lecture des vidéos de `public/streams.json` | ✅ (2 films du domaine public livrés) |
| « Où regarder » (Watchmode / Movie of the Night) | ⚙️ codé — nécessite une clé API gratuite |
| Lecture de films récents sous droits | ❌ hors périmètre : aucune source légale libre |

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
| HTTP | `fetch` natif |

---

## Démarrage

```bash
npm install
cp .env.example .env     # puis renseignez vos clés
npm run dev              # http://localhost:5173
npm run build            # typecheck + build dans dist/
npm run preview          # sert dist/ en local
```

---

## Variables d'environnement

Toutes les variables sont **publiques** : elles sont intégrées en clair dans le
bundle. Ne mettez jamais de secret ici.

| Variable | Rôle | Où l'obtenir |
| --- | --- | --- |
| `VITE_TMDB_API_KEY` | Clé API TMDB **v3** (32 caractères) | <https://www.themoviedb.org/settings/api> |
| `VITE_TMDB_LANGUAGE` | Langue des métadonnées (`fr-FR`) | — |
| `VITE_WATCH_REGION` | Pays pour la disponibilité (`FR`) | — |
| `VITE_WATCHMODE_API_KEY` | Clé Watchmode | <https://api.watchmode.com/requestApiKey/> |
| `VITE_STREAMING_AVAILABILITY_API_KEY` | Clé Movie of the Night | <https://developers.movieofthenight.com/> |
| `VITE_DEMO_STREAM_URL` | Flux public de test du lecteur (optionnel) | — |

Les deux clés de disponibilité sont **facultatives** : sans elles, la section
« Où regarder » affiche simplement comment les activer.

---

## Où regarder (Watchmode / Streaming Availability)

`src/services/watchProviders.ts` interroge, **depuis le navigateur** (les deux
APIs renvoient `Access-Control-Allow-Origin: *`, donc compatibles GitHub Pages) :

```
GET https://api.watchmode.com/v1/title/{movie|tv}-{tmdbId}/sources/?regions=FR
    header X-API-Key: <VITE_WATCHMODE_API_KEY>

GET https://api.movieofthenight.com/v4/shows/{movie|tv}/{tmdbId}
    header X-API-Key: <VITE_STREAMING_AVAILABILITY_API_KEY>
```

Le résultat est fusionné, dédupliqué et trié (abonnement → gratuit → publicité →
location → achat). Chaque offre affiche la plateforme, le type, la qualité, le
prix éventuel et un **lien officiel** (`web_url` / `link`) ouvert dans un nouvel
onglet. Aucun flux vidéo n'est renvoyé par ces APIs : elles répondent à
« où est-ce disponible légalement ? », pas « donne-moi le film ».

Notes :

- Watchmode offre 2 500 crédits/mois (non commercial) et 3 pays sur le plan gratuit.
- Movie of the Night propose un plan gratuit sans carte.
- `VITE_WATCH_REGION` change le pays interrogé (`FR`, `BE`, `CA`, `US`…).
- **Simkl** n'est pas utilisé : son API sert au suivi de visionnage (watchlist,
  scrobble, OAuth) et aux métadonnées, sans disponibilité ni URL de lecture.
  L'ajouter imposerait un compte utilisateur, inutile pour cette fonctionnalité.
- **api.moviez.ac** n'est pas intégré : c'est un service d'embed de films, hors du
  cadre légal des APIs ci-dessus. Le projet ne branche pas de source non autorisée.

---

## Lecture : `public/streams.json`

Pour lire des vidéos dont vous détenez les droits (ou du domaine public), aucun
serveur n'est nécessaire. Hébergez le fichier en HTTPS (Cloudflare R2, S3, Bunny,
un serveur à vous…) puis déclarez-le :

```json
{
  "sources": {
    "movie:19": [
      { "url": "https://exemple.com/metropolis.mp4", "quality": "480p", "provider": "Mon hébergement" }
    ],
    "tv:1399:1:1": [
      {
        "url": "https://exemple.com/got-s01e01.m3u8",
        "quality": "1080p",
        "subtitles": [{ "label": "Français", "lang": "fr", "url": "https://exemple.com/fr.vtt" }]
      }
    ]
  }
}
```

- Clés : `movie:<tmdbId>`, `tv:<tmdbId>`, `tv:<tmdbId>:<saison>`, `tv:<tmdbId>:<saison>:<épisode>`
  (la clé la plus précise gagne).
- Formats : MP4 H.264 ou HLS `.m3u8` ; sous-titres WebVTT.
- Le fichier est servi à la racine du site (`/streams.json`, `/cineva/streams.json`
  sur GitHub Pages).
- Le dépôt contient deux films du **domaine public** en démonstration :
  *Metropolis* (1927, TMDB 19) et *Nosferatu* (1922, TMDB 653).

### Lecteur

- HLS via `hls.js` (récupération auto réseau/média), HLS natif Safari, MP4 natif, embeds iframe.
- Contrôles : lecture, ±10 s, volume, qualité (niveaux HLS), sous-titres,
  image dans l'image, plein écran. Raccourcis : `Espace`/`K`, `←`/`→`, `↑`/`↓`, `M`, `F`.

---

## Déploiement sur GitHub Pages

Le workflow `.github/workflows/deploy.yml` build et publie `dist/` sur la branche
`gh-pages` à chaque push sur `main`. Pages est configuré sur cette branche.

- Base path : `BASE_PATH=/<nom-du-repo>/` est défini par le workflow, donc les
  assets pointent vers `https://<user>.github.io/<repo>/`.
- Routage : `HashRouter` (`#/film/603`), aucun rewrite serveur nécessaire.
- Clés : **Settings → Secrets and variables → Actions → Variables**
  - `WATCHMODE_API_KEY`
  - `STREAMING_AVAILABILITY_API_KEY`
  - `WATCH_REGION` (facultatif, `FR` par défaut)

  Après ajout d'une variable, relancez le workflow (Actions → Deploy to GitHub
  Pages → Run workflow) : les valeurs sont injectées au build.

---

## Arborescence

```
.github/workflows/deploy.yml   Build + publication sur gh-pages
public/streams.json            Catalogue local de sources (vos vidéos)
src/
├── App.tsx                    Routes (lazy) + ScrollToTop
├── main.tsx                   HashRouter + StrictMode
├── components/
│   ├── layout/                Header, ProfileMenu, Footer, AppLayout
│   ├── media/                 HeroBanner, MediaRow, MediaCard, MediaGrid,
│   │                          TrailerModal, WatchProviders
│   ├── player/                VideoPlayer (HLS), SourceList
│   └── ui/                    Icônes, Skeleton, ErrorState, Logo, PosterImage
├── config/rows.ts             Rangées de l'accueil
├── hooks/                     useAsync (annulable), useDebouncedValue
├── pages/                     Home, Detail, Search, MyList, Watch, NotFound
├── services/
│   ├── tmdb.ts                Client TMDB typé, cache 5 min, erreurs FR
│   ├── watchProviders.ts      Disponibilité Watchmode + Movie of the Night
│   └── streamResolver.ts      Catalogue local + flux de démo
├── store/myList.ts            Zustand + persist
└── types/media.ts             Types métier
```

---

## Qualité & limites

- Responsive mobile → desktop, images `loading="lazy"`, code splitting par route,
  squelettes, erreurs par section, `aria-label` sur les contrôles du lecteur,
  navigation clavier, `prefers-reduced-motion`.
- Clé TMDB publique par conception, à restreindre par domaine dans TMDB.
- Les APIs de disponibilité peuvent ne pas référencer un titre : le lien officiel
  fait foi.
- Aucun compte utilisateur : « Ma liste » vit dans le localStorage.
