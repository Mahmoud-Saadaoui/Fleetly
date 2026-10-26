<div align="center">

# Fleetly — Frontend

[![React](https://img.shields.io/badge/React-18.2-61DAFB?style=for-the-badge&logo=react&logoColor=white)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![i18next](https://img.shields.io/badge/i18next-25-26A69A?style=for-the-badge&logo=i18next&logoColor=white)](https://www.i18next.com/)

**Fleetly — Plateforme de location automobile.**

</div>

---

## Aperçu

Fleetly est une application web de location automobile permettant aux clients de parcourir les véhicules, de demander des devis et de gérer leurs réservations. L'interface est multilingue (français, anglais, arabe) avec support RTL automatique.

## Fonctionnalités

| Fonctionnalité | Description |
|----------------|-------------|
| **Page d'accueil** | Présentation des véhicules, offres et services |
| **Authentification** | Inscription et connexion utilisateur |
| **Multilingue** | Français, anglais, arabe avec bascule automatique RTL |
| **Design responsive** | Interface adaptée mobile, tablette et desktop |
| **Thème personnalisé** | Palette de couleurs Fleetly (or/charbon) |

## Stack technique

- **React 18** + **Vite 7**
- **Tailwind CSS 4** (`@tailwindcss/vite`)
- **React Router 7** (routes lazy-loaded)
- **i18next** + **react-i18next** + **browser-language-detector**
- **ESLint 9** (flat config, react-hooks, react-refresh)

## Démarrage

### Prérequis

- **Node.js** v18 ou supérieur
- **npm** (ou yarn / pnpm)

### Installation

```bash
git clone <votre-url-depot> fleetly-frontend
cd fleetly-frontend
npm install
cp .env.example .env
# Définir VITE_API_URL (par défaut http://localhost:5001/api)
npm run dev
```

L'application est disponible sur `http://localhost:5173`.

### Scripts disponibles

| Commande | Description |
|----------|-------------|
| `npm run dev` | Serveur de développement avec HMR |
| `npm run build` | Build de production |
| `npm run preview` | Prévisualiser le build de production |
| `npm run lint` | Lancer ESLint |
| `npm run lint:fix` | Corriger automatiquement les problèmes ESLint |

## Structure du projet

```
src/
├── assets/            # Images et médias
├── components/        # Composants réutilisables (Header, Loading, ...)
├── config/            # Configuration i18n
├── hooks/             # Hooks personnalisés
├── layouts/           # Layouts de pages (MainLayout)
├── locales/           # Fichiers de traduction (en/fr/ar)
├── pages/             # Composants de pages (HomePage, LoginPage, ...)
├── services/          # Services externes / clients API
├── styles/            # Styles globaux, tokens de design
├── utils/             # Fonctions utilitaires partagées
├── App.jsx            # Routes (lazy loaded)
├── main.jsx           # Point d'entrée
└── index.css          # Import Tailwind + styles globaux
```

## Déploiement

```bash
npm run build   # génère le dossier dist/
```

Déployez le dossier `dist/` sur Vercel, Netlify ou tout hébergeur statique.

## Licence

MIT
