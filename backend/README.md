# Fleetly API

API REST Express/Mongoose de la plateforme de location automobile Fleetly.

## Démarrer

Prérequis : Node.js 20+, npm et MongoDB.

```bash
npm install
cp .env.example .env
npm run dev
```

Le serveur écoute par défaut sur le port `5001`.

## Routes principales

| Méthode | Route | Accès |
|---|---|---|
| POST | `/api/users/register` | Public |
| POST | `/api/users/login` | Public |
| GET | `/api/users/me` | Authentifié |
| GET | `/api/vehicles` | Public |
| POST | `/api/vehicles` | `admin` / `agency_manager` |
| PATCH | `/api/vehicles/:id/status` | `admin` / `agency_manager` |
| POST | `/api/bookings/quote` | Public |
| POST | `/api/bookings` | Client authentifié (`user`) |
| GET | `/api/bookings/mine` | Client authentifié (`user`) |
| PATCH | `/api/bookings/:id/status` | `admin` / `agency_manager` |
| GET | `/api/analytics/overview` | `admin` |
| GET | `/api/analytics/profitability` | `admin` |
| GET | `/health` | Public |

Toutes les routes protégées utilisent `Authorization: Bearer <JWT>`.

## Rôles

Rôles canoniques : `user`, `agency_manager`, `admin`.

Les rôles sont vérifiés côté serveur. Les `agency_manager` sont limités aux agences présentes dans `branchIds`.

## Variables d’environnement

Voir `.env.example`. Les montants métier sont stockés en centimes et les réservations utilisent une clé d’idempotence pour éviter les doublons.

## Scripts

```bash
npm run dev      # Démarrage en développement
npm run seed     # Données de démo
npm test         # Tests
npm run check    # Vérification syntaxe/lint
```

## Vérifier le projet

```bash
npm run check
npm test
```
