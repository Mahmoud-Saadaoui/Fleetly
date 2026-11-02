# Fleetly

**MVP release:** `1.0.0-mvp` — reservation requests, operator confirmation and fleet operations.

Fleetly est une plateforme de location automobile et de pilotage de flotte.

## Espaces produit

- `/` — expérience client : recherche, disponibilité et flotte.
- `/admin` — cockpit opérateur : réservations, flotte, branches et utilisateurs (accès réservé aux rôles `agency_manager` et `admin`).
- `/login` et `/register` — authentification client.
- `landing/` — référence visuelle originale du produit.

## Rôles canoniques

- `user` — client
- `agency_manager` — gestionnaire d'agence
- `admin` — administrateur

## Démarrer

```bash
cd backend && npm install && npm run dev
cd frontend && npm install && npm run dev
```

Le backend écoute par défaut sur le port `5001`. Le frontend utilise `VITE_API_URL` (par défaut `http://localhost:5001/api`).

## Vérifier

```bash
cd backend && npm test && npm run check
cd frontend && npm test && npm run lint && npm run build
```

La stratégie de migration, les rôles RBAC, le modèle métier, les statistiques et le plan de mise en production sont détaillés dans [`_docs/CAR_RENTAL_MIGRATION_PLAN.md`](_docs/CAR_RENTAL_MIGRATION_PLAN.md).

## Limites connues du MVP

- Le paiement en ligne n'est pas activé : une réservation est une demande `pending_payment` que l'opérateur confirme.
- Les notifications email et les connexions OAuth nécessitent une configuration de production dédiée.
- Le déploiement, les sauvegardes et la procédure de retour arrière sont décrits dans [`DEPLOYMENT.md`](DEPLOYMENT.md).
- Avant chaque mise en production, exécuter la release gate documentée dans [`ACCEPTANCE.md`](ACCEPTANCE.md).
