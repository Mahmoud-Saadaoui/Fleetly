# Fleetly - Plateforme de location automobile MVP

## Présentation

Fleetly est une plateforme complète de location automobile conçue pour digitaliser la gestion des locations de véhicules. Développée avec une stack moderne (React + Express + MongoDB), elle permet aux agences de gérer leur flotte, leurs réservations et leurs clients depuis une interface centralisée.

## Fonctionnalités principales

### Côté Client
- ✅ Catalogue de véhicules avec filtres (catégorie, agence, dates)
- ✅ Page détail véhicule avec calcul de devis en temps réel
- ✅ Processus de réservation complet
- ✅ Espace personnel "Mes locations" avec historique
- ✅ Authentification classique + OAuth Google/Facebook

### Côté Administrateur/Dashboard
- ✅ Tableau de bord avec KPIs (CA, réservations, flotte)
- ✅ Gestion complète des véhicules (CRUD)
- ✅ Gestion des agences/branches (CRUD)
- ✅ Gestion des réservations + changement de statut
- ✅ Gestion des utilisateurs et rôles
- ✅ **Calendrier des réservations en cours** (FullCalendar - vue mois/semaine/jour)
- ✅ Page analytique

### Caractéristiques techniques
- ✅ API REST robuste (Express + Mongoose)
- ✅ Authentification JWT
- ✅ Gestion des rôles (RBAC)
- ✅ Pagination centralisée
- ✅ Soft deletes
- ✅ Validation côté serveur
- ✅ Responsive design (TailwindCSS 4)
- ✅ Thème sombre professionnel
- ✅ Notifications toast
- ✅ Gestion des conflits de réservation

## Stack technique

**Frontend:** React 18, Vite 7, TailwindCSS 4, React Router, Axios, React Query, FullCalendar, React Hot Toast, React Icons  
**Backend:** Node.js, Express 4, MongoDB/Mongoose, JWT, express-validator, Winston  
**Sécurité:** Helmet, CORS, Rate limiting

## Installation & Lancement

### Prérequis
- Node.js 20+
- MongoDB (local ou Atlas)

### Backend
```bash
cd backend
npm install
cp .env.example .env
# Configurer MONGO_URI, JWT_SECRET
npm run seed  # Génère données de démo
npm run dev   # Port 5001
```

### Frontend
```bash
cd frontend
npm install
echo "VITE_API_URL=http://localhost:5001/api" > .env
npm run dev   # Port 5173
```

## Comptes de démo

Après `npm run seed` dans le backend :
- **Admin:** admin@demo.com / demo1234
- **Gestionnaire d'agence:** agency@demo.com / demo1234  
- **Client:** user@demo.com / demo1234

## Déploiement

- **Frontend:** Vercel, Netlify (build statique)
- **Backend:** Render, Railway
- **BDD:** MongoDB Atlas

## Tests

```bash
# Backend
cd backend && npm test  # 76 tests passent
# Frontend
cd frontend && npm run build
```

## Points forts MVP

- Code propre et structuré
- Backend déjà testé et fonctionnel
- Interface moderne et professionnelle
- Calendrier requis parfaitement implémenté
- Données de démo prêtes à l'emploi
- Prêt pour démo commerciale

**Version:** MVP 1.0 - Prêt à vendre sur Khamsat/Upwork
