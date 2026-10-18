## Migration des rôles

Mapping vers le modèle simplifié (`user`, `agency_manager`, `admin`) :

- `agent`, `fleet_manager` -> `agency_manager`
- `finance_manager`, `support`, `customer` -> `user`
- `user`, `admin` inchangés

### Exécution

```bash
cd backend
MONGODB_URI=mongodb://localhost:27017/fleetly node scripts/migrate-roles.js
```

Le script est idempotent (relancer ne réécrit pas les rôles déjà migrés).
