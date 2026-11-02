# Fleetly — recette MVP

Cette checklist est la gate fonctionnelle avant publication. Elle doit être exécutée sur une base de staging fraîche avec les trois langues activées.

## Vérifications automatisées

```bash
cd backend && npm test && npm run check
cd ../frontend && npm test && npm run lint && npm run build
cd .. && npm run e2e
```

Attendu : aucune erreur, aucun test en échec, et le smoke test Playwright vert.

## Parcours client

- [ ] Catalogue et recherche par marque/modèle.
- [ ] Dates passées et périodes réservées refusées.
- [ ] Devis automatique, inscription et demande de réservation.
- [ ] Conflit simultané sans double réservation.
- [ ] Brouillon conservé après login puis effacé après succès.
- [ ] Détail client : référence, dates, agences, montant, statut et annulation autorisée.

## Parcours opérateur

- [ ] `user` ne peut pas accéder à `/admin`.
- [ ] `agency_manager` est limité à ses branches ; `admin` dispose du périmètre complet.
- [ ] Filtres de réservations et calendrier par période, branche, véhicule et statut.
- [ ] Transitions de statut conformes à la machine d'état.
- [ ] Véhicules indisponibles et branches désactivées non réservables.

## Compatibilité et résilience

- [ ] Desktop et mobile vérifiés.
- [ ] FR, EN et AR vérifiés, avec RTL en arabe.
- [ ] API coupée : erreur traduite, état vide ou retry visible.
- [ ] `/health/live` reste disponible et `/health/ready` devient 503 si MongoDB est indisponible.
- [ ] Request ID corrélé dans les logs, sans données sensibles.

## Go / no-go

Go uniquement si tous les points sont cochés, la CI est verte et le rollback décrit dans [`DEPLOYMENT.md`](DEPLOYMENT.md) a été testé sur staging.
