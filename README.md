# Fleetly

Fleetly est une plateforme de location automobile et de pilotage de flotte.

## Espaces produit

- `/` — expérience client : recherche, disponibilité et flotte premium.
- `/admin` — cockpit opérateur : revenus, occupation, réservations et rentabilité.
- `/login` et `/register` — authentification client.
- `landing/` — référence visuelle originale du produit.

## Démarrer

```bash
cd backend && npm install && npm run dev
cd frontend && npm install && npm run frontend
```

Le frontend utilise `http://localhost:5000/api` en développement. Définir `VITE_API_URL` pour un autre environnement.

## Vérifier

```bash
cd frontend && npm run build && npm test
cd backend && npm run check && npm test
```

La stratégie de migration, les rôles RBAC, le modèle métier, les statistiques et le plan de mise en production sont détaillés dans [`_docs/CAR_RENTAL_MIGRATION_PLAN.md`](_docs/CAR_RENTAL_MIGRATION_PLAN.md).
