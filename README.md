# 🐷 Cotting Transport SA

Application de gestion des livraisons pour Cotting SA.

## Installation locale (développement)

```bash
# 1. Installer les dépendances
npm install

# 2. Lancer en mode dev
npm run dev

# 3. Ouvrir http://localhost:5173
```

## Déploiement gratuit

### Option A : Vercel (recommandé)
1. Crée un compte sur [vercel.com](https://vercel.com) (gratuit avec GitHub)
2. Push ce projet sur GitHub
3. Sur Vercel : "New Project" → importe ton repo GitHub
4. Framework: Vite → Deploy
5. Tu obtiens `ton-projet.vercel.app`

### Option B : Netlify
1. Crée un compte sur [netlify.com](https://netlify.com)
2. Drag & drop le dossier `dist/` après `npm run build`
3. Ou connecte GitHub pour auto-deploy

### Option C : GitHub Pages (gratuit)
1. `npm run build`
2. Push le contenu de `dist/` sur une branche `gh-pages`

## Installation PWA sur mobile

### iPhone (Safari)
1. Ouvrir le lien de l'app
2. Appuyer sur le bouton "Partager" (carré avec flèche)
3. "Sur l'écran d'accueil"
4. "Ajouter"

### Android (Chrome)
1. Ouvrir le lien de l'app
2. Menu ⋮ (trois points)
3. "Ajouter à l'écran d'accueil"
4. "Ajouter"

## Structure du projet

```
cotting-transport/
├── index.html          # Page HTML principale
├── package.json        # Dépendances
├── vite.config.js      # Config Vite + PWA
├── public/             # Icônes (à ajouter)
│   ├── pig-icon-192.png
│   └── pig-icon-512.png
└── src/
    ├── main.jsx        # Point d'entrée React
    ├── supabase.js     # Client Supabase
    └── App.jsx         # Application complète
```

## Base de données (Supabase)

Tables :
- `drivers` : chauffeurs (nom, téléphone, PIN)
- `clients` : clients (nom, adresse, contact, notes, quantité défaut)
- `deliveries` : livraisons (date, chauffeur, client, quantités, statut, notes)

## Fonctionnalités

- **Vue Patron** : gestion clients, création des tournées, suivi en temps réel
- **Vue Chauffeur** : liste des livraisons, confirmation avec quantité et notes
- **Vue Bureau** : récap mensuel, export CSV détaillé et résumé par client
- **PWA** : installable sur mobile, fonctionne comme une app native
- **Temps réel** : les données se synchronisent entre tous les appareils

## Notes importantes

- Les icônes PWA (pig-icon-192.png et pig-icon-512.png) doivent être créées
  et placées dans le dossier `public/`
- La clé Supabase dans `src/supabase.js` est la clé publique (anon) — c'est OK
- Pour la production, activer le plan Pro Supabase (25$/mois) pour les backups
