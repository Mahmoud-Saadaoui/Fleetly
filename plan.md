# Plan MVP Fleetly - Prêt à vendre (Khamsat/Upwork)

## 1. État actuel du projet

### 1.1 Backend (déjà implémenté)
- **Stack**: Express 4 + Mongoose (MongoDB) + JWT + express-validator
- **Auth**: classique (register/login) + OAuth Google/Facebook
- **Rôles canoniques**: `user`, `agency_manager`, `admin` (avec compat `isAdmin`)
- **Fonctionnalités**:
  - Gestion utilisateurs (CRUD admin, invitation, soft delete)
  - Véhicules (listing public, création par `agency_manager`/`admin`, mise à jour statut, édition/suppression par `admin`)
  - Branches/agences (CRUD complet)
  - Réservations (devis, création, historique utilisateur, mise à jour statut par `admin`/`agency_manager`)
  - Vue par agences assignées pour `agency_manager`
  - Analytics (overview, rentabilité)
  - Pagination centralisée + helpers API
  - Tests: 76 tests passent (node:test)
  - Sécurité: helmet, rate-limiting, CORS, validation, logging winston

### 1.2 Frontend (partiel)
- **Stack**: React 18 + Vite 7 + TailwindCSS 4 + React Router + i18next + react-icons
- **Pages existantes**: HomePage (landing stylisé), LoginPage, RegisterPage, NotFound
- **Design**: Theme sombre (dark/accent) assez soigné
- **Manque**: Dashboard admin, interface utilisateur pour louer véhicules, historique, calendrier, context auth, gestion tokens

### 1.3 Points forts
- Backend solide, testé, bien structuré (routes/controllers/models/validators/middlewares)
- Schéma cohérent (booking, vehicle, user, branch)
- Gestion conflits réservation déjà présente
- Pagination, soft deletes, RBAC
- Auth sociale fonctionnelle côté API

### 1.4 Lacunes pour un MVP "prêt à vendre"
- Frontend utilisateur incomplet: pas de catalogue véhicules, pas de formulaire réservation avec calendrier, pas d'historique "mes locations"
- Pas de dashboard admin (UI) - juste API
- Pas de calendrier pour afficher réservations en cours (FullCalendar/BigCalendar ou vue calendrier simple)
- Pas de contexte Auth/ProtectedRoute côté frontend
- Pas de configuration API client (axios/fetch avec interceptors)
- Pas de pages: Véhicules, Détail véhicule, Réserver, Mon compte/historique, Dashboard admin (véhicules, réservations, agences, utilisateurs, calendrier)
- Traduction i18n présente mais peu utilisée
- Pas de données seed/demo pour démo vendeuse
- Responsive ok mais UX réservation à améliorer
- Pas de validations côté frontend cohérentes avec backend

## 2. Objectifs MVP

Créer une plateforme de location voiture **fonctionnelle, propre et démontrable** prête à être vendue sur Khamsat/Upwork.

**Cible utilisateur**: Agences/location auto petites/moyennes qui veulent digitaliser leurs locations.

**Fonctionnalités clés à livrer**:

1. **Interface utilisateur (client)**
- Catalogue véhicules avec filtres (marque/modèle, catégorie, agence/branche, prix, disponibilité)
- Page détail véhicule
- Processus de réservation (sélection dates pickup/return, calcul devis/prix, confirmation)
- Espace client: "Mes locations" / historique (en cours, passées, annulées)
- Profil utilisateur basique

2. **Dashboard Administrateur**
- Vue d'ensemble (KPIs: réservations, CA estimé, véhicules disponibles/occupés, agences)
- Gestion véhicules (CRUD: ajout/modif/suppression logique, upload images placeholder)
- Gestion agences/branches (CRUD)
- Gestion réservations (liste + filtres + changer statut: confirmed/active/completed/cancelled)
- Gestion utilisateurs (inviter, assigner rôle/agences, activer/désactiver)
- **Calendrier des réservations en cours** (vue calendrier mensuel/semaine/jour) - afficher réservations par véhicule/date

3. **Expérience démo**
- Données de démo (véhicules, agences, réservations)
- UX fluide et professionnel (cohérent avec landing existant)
- Responsive mobile

## 3. Stack technique à conserver

- **Backend**: Express + Mongoose - conserver tel quel (API déjà complète)
- **Frontend**: Vite + React 18 + TailwindCSS 4 + react-router-dom + i18next
- **Calendrier**: [@fullcalendar/react](https://fullcalendar.io/docs/react) (gratuit, moderne, vue mois/semaine/jour, events drag/drop optionnel)
- **HTTP**: axios (avec interceptors token)
- **UI**: composants custom + react-icons
- **State**: Context API (AuthContext, peut étendre) + React Query (tanstack/react-query) recommandé pour cache/fetch

## 4. Analyse API existante (à utiliser)

| Endpoint | Usage | Notes |
|---|---|---|
| POST /api/users/register, login | Auth | OK |
| GET /api/users/me | Profil | OK |
| GET /api/vehicles | Catalogue public (avec pagination + filtres) | Déjà gère fenêtre dates (disponibilité) |
| POST /api/bookings/quote | Devis avant réservation | OK |
| POST /api/bookings | Créer réservation (auth) | OK |
| GET /api/bookings/mine | Historique client | OK (paginé) |
| GET /api/branches | Liste agences | OK |
| Admin routes (/api/admin/*, /api/agent/*, /api/analytics/*) | Dashboard | Toutes présentes |

**Pas besoin de toucher backend** sauf éventuellement petits ajustements si frontend nécessite. Backend est fonctionnel.

## 5. Structure frontend à créer

```
frontend/src/
├── api/
│   ├── axios.js        # instance axios + interceptors
│   └── endpoints.js    # helpers appels API
├── components/
│   ├── auth/
│   │   ├── ProtectedRoute.jsx
│   │   └── RoleGuard.jsx
│   ├── booking/
│   │   ├── BookingCalendar.jsx  # calendrier réservations
│   │   ├── DateRangePicker.jsx
│   │   └── VehicleCard.jsx
│   ├── common/         # existant
│   ├── dashboard/
│   │   ├── Sidebar.jsx
│   │   ├── Topbar.jsx
│   │   └── StatsCard.jsx
│   ├── forms/
│   └── layout/
│       └── DashboardLayout.jsx
├── context/
│   ├── AuthContext.jsx
│   └── BookingContext.jsx (optionnel)
├── hooks/
│   ├── useAuth.js
│   ├── useVehicles.js
│   └── useBookings.js
├── pages/
│   ├── public/         # existant
│   │   ├── HomePage.jsx
│   │   ├── LoginPage.jsx
│   │   ├── RegisterPage.jsx
│   │   ├── VehiclesPage.jsx      # NOUVEAU - catalogue
│   │   ├── VehicleDetailPage.jsx # NOUVEAU
│   │   └── NotFound.jsx
│   ├── user/
│   │   ├── BookingsPage.jsx      # NOUVEAU - mes locations
│   │   ├── ProfilePage.jsx       # NOUVEAU
│   │   └── BookingConfirmPage.jsx# NOUVEAU
│   └── admin/
│       ├── DashboardHome.jsx     # NOUVEAU
│       ├── VehiclesList.jsx      # NOUVEAU
│       ├── VehiclesForm.jsx      # NOUVEAU
│       ├── BranchesList.jsx      # NOUVEAU
│       ├── BranchesForm.jsx      # NOUVEAU
│       ├── UsersList.jsx         # NOUVEAU
│       ├── BookingsList.jsx      # NOUVEAU
│       ├── CalendarPage.jsx      # NOUVEAU - calendrier réservations
│       └── AnalyticsPage.jsx     # NOUVEAU (optionnel)
└── utils/
    ├── format.js
    ├── constants.js
    └── helpers.js
```

## 6. Fonctionnalités détaillées

### 6.1 Authentification frontend
- AuthContext: stocker token + user (id, name, email, role, branchIds)
- Persister dans localStorage
- Interceptor axios: ajouter Authorization header, gérer 401 (logout)
- ProtectedRoute pour routes protégées
- RoleGuard pour `admin`/`agency_manager`
- Connexion sociale: boutons Google/Facebook redirigent vers API backend (/api/auth/google etc), callback à gérer ou redirection backend renvoie token? Backend renvoie JSON avec token - si redirection classique, mieux passer token via query param ou utiliser flow SPA. À vérifier: actuellement backend fait res.redirect/url; pour SPA, on peut soit adapter backend pour renvoyer token+user en JSON, soit passer token dans URL callback et récupérer.

### 6.2 Catalogue véhicules (public)
- Filtres: catégorie, branche, prix min/max, disponibilité par dates (from/to)
- Cartes véhicules: image, marque+modèle, catégorie, transmission/carburant, places, prix/jour
- Tri: prix asc/desc, récent
- Pagination
- Lien "Réserver" si connecté

### 6.3 Réservation
- Sélection dates (pickup/return) avec validation (date fin > date début, pas passé)
- Afficher devis via /quote (prix calculé)
- Si disponible → formulaire confirmation (pickupBranch/returnBranch, notes optionnel)
- Créer réservation → redirection "Mes locations"
- Gérer idempotencyKey (générer côté client ex: uuid)

### 6.4 Espace client
- Onglets: "En cours", "À venir", "Terminées", "Annulées"
- Détail réservation (véhicule, dates, agence, prix, statut)
- Annulation si pending_payment/confirmed? (vérifier règles)

### 6.5 Dashboard Admin - structure
Layout avec Sidebar (Dashboard, Véhicules, Agences, Réservations, Utilisateurs, Calendrier, Analytics) + Topbar (profil, logout)

### 6.6 Gestion CRUD
- **Véhicules**: formulaire avec tous champs modèle + validation
- **Branches**: nom, code, adresse, ville, contact
- **Réservations**: liste filtrable (statut, date, client, véhicule), actions changer statut
- **Utilisateurs**: liste + invitation + assignation rôles/branches

### 6.7 Calendrier réservations (REQUIS)
Objectif: "implémenter des calendriers pour afficher les reserves en cours"

Implémenter FullCalendar:
- Vue: month/week/day
- Events: réservations actives (confirmed/active) avec titre "Véhicule - Client", couleur par statut
- Clic event → modal détails (véhicule, client, dates, agence, statut)
- Filtres: par branche, par véhicule, par statut
- Optionnel: glisser-déposer pour changer dates (à éviter MVP, peut complexifier validation conflits)

**Données**: utiliser GET /api/agent/bookings (`agency_manager`/`admin`). Mapper vers format FullCalendar {id, title, start, end, backgroundColor, extendedProps}

## 7. UX/UI améliorations

- Harmoniser avec landing existant (dark theme, accent color)
- Composants réutilisables: Button, Input, Card, Modal, Table, Badge statut
- États loading/empty/error
- Toasts (react-hot-toast)
- Validation formulaires côté client
- Messages en français cohérents
- Responsive tables (scroll horizontal)

## 8. Données de démo (seed)

Créer script `backend/seed/demo.js` pour générer données démonstrables:

- 2-3 branches (Paris, Lyon...)
- 6-10 véhicules variés (catégories existantes)
- 2-3 utilisateurs `admin`/`agency_manager` + quelques clients `user`
- 3-5 réservations avec statuts différents + dates proches (pour calendrier visible)

Ajouter script npm: `"seed": "node seed/demo.js"`

## 9. Déploiement MVP

Cible vente: démo fonctionnelle + code livré.

Options:
- **Frontend**: Vercel/Netlify (build static)
- **Backend**: Render/Railway/Hostinger/Heroku alternative (Render gratuit possible)
- **DB**: MongoDB Atlas (gratuit M0)
- **Domaine**: configurable via env

Mettre à jour `.env.example` frontend: `VITE_API_URL`

## 10. Plan d'exécution par étapes

### Étape 1: Setup frontend base (0.5-1j)
- [ ] Créer api/axios.js avec interceptors
- [ ] Créer context/AuthContext + hooks/useAuth
- [ ] Créer ProtectedRoute + RoleGuard (rôles canoniques `user`, `agency_manager`, `admin`)
- [ ] Connecter Login/Register existants à API backend
- [ ] Mettre à jour App.jsx avec routes
- [ ] Ajouter .env VITE_API_URL

### Étape 2: Interface utilisateur publique (1-2j)
- [ ] Créer VehiclesPage (catalogue + filtres)
- [ ] Créer VehicleDetailPage
- [ ] Créer Booking flow (sélection dates + quote + confirmation)
- [ ] Créer BookingsPage (mes locations)
- [ ] Lier depuis HomePage (liens vers /vehicles)

### Étape 3: Dashboard admin layout + pages (2-3j)
- [ ] DashboardLayout + Sidebar + Topbar
- [ ] DashboardHome (KPIs)
- [ ] VehiclesList + VehiclesForm
- [ ] BranchesList + BranchesForm
- [ ] UsersList (admin)
- [ ] BookingsList (admin/agent/fleet)
- [ ] Gérer rôles/permissions UI selon les rôles canoniques (`user`, `agency_manager`, `admin`)

### Étape 4: Calendrier réservations (1-1.5j)
- [ ] Installer @fullcalendar/react @fullcalendar/daygrid @fullcalendar/timegrid @fullcalendar/interaction
- [ ] Créer CalendarPage (admin/agency_manager)
- [ ] Mapper bookings vers events (confirmed/active)
- [ ] Filtres par branche/statut
- [ ] Modal détail événement
- [ ] Style cohérent thème sombre

### Étape 5: UX polish + i18n + démo (0.5-1j)
- [ ] Toasts notifications
- [ ] États vides/loading
- [ ] Validation formulaires
- [ ] Améliorer Header (menu connecté/déconnecté)
- [ ] Créer seed/demo.js avec rôles canoniques (`admin`, `agency_manager`, `user`)
- [ ] Script npm seed
- [ ] Tests manuels parcours complet

### Étape 6: Documentation + préparation vente (0.5j)
- [ ] Mettre à jour README principal (fonctionnalités, démo, setup)
- [ ] Créer README_VENTE.md (pitch, screenshots, tech, démo URL)
- [ ] Nettoyer console.log
- [ ] Vérifier build frontend/backend

## 11. Dépendances frontend à ajouter

```json
{
  "axios": "^1.7.x",
  "@tanstack/react-query": "^5.x",
  "react-hot-toast": "^2.4.x",
  "@fullcalendar/react": "^6.x",
  "@fullcalendar/daygrid": "^6.x",
  "@fullcalendar/timegrid": "^6.x",
  "@fullcalendar/interaction": "^6.x",
  "date-fns": "^4.x",
  "react-datepicker": "^7.x"
}
```

**Note**: FullCalendar suffit. date-fns utile pour formatage.

## 12. Critères MVP "prêt à vendre"

- [ ] Un visiteur peut parcourir véhicules et voir disponibilités
- [ ] Un client peut s'inscrire/se connecter et réserver un véhicule
- [ ] Un client voit son historique "Mes locations"
- [ ] Un `admin`/`agency_manager` accède au dashboard selon ses permissions
- [ ] L'opérateur voit **calendrier des réservations en cours** (confirmed + active)
- [ ] CRUD véhicules/agences/réservations fonctionnel
- [ ] Gestion utilisateurs/rôles OK avec les rôles canoniques
- [ ] Design cohérent, responsive
- [ ] Données démo convaincantes
- [ ] Pas d'erreurs console
- [ ] Build frontend OK, backend check OK

## 13. Risques & mitigations

- **Redirection OAuth SPA**: adapter callback ou utiliser popup? Solution simple: backend renvoie token en JSON si ?frontend=... ou créer route qui redirige vers frontend avec token. À ajuster si besoin.
- **Conflits réservation**: déjà gérés backend - bien afficher messages erreur.
- **Permissions UI vs API**: toujours respecter rôles (RoleGuard + masquage menus)
- **Images véhicules**: MVP peut utiliser placeholders Unsplash avec catégorie
- **Calendrier sur mobile**: FullCalendar responsive ok

## 14. Estimation temps total

| Étape | Temps | Priorité |
|---|---|---|
| 1. Base auth/routes | 0.5-1j | CRITIQUE |
| 2. UI utilisateur réservation | 1-2j | CRITIQUE |
| 3. Dashboard admin | 2-3j | CRITIQUE |
| 4. Calendrier réservations | 1-1.5j | CRITIQUE (requis) |
| 5. Polish + seed | 0.5-1j | IMPORTANT |
| 6. Doc vente | 0.5j | IMPORTANT |

**Total: 5-8 jours de développement ciblé**

## 15. Recommandation immédiate

**Commencer par Étape 1**: AuthContext + axios + ProtectedRoute + connecter Login/Register. C'est le socle pour tout le reste. Ensuite construire UI utilisateur (réservation) avant dashboard complexe.

Le backend est déjà très bon. L'effort est 95% frontend pour atteindre un vrai MVP vendable.