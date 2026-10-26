# Fleetly — Plan d'action technique MVP

Plan séquentiel issu de l'audit. Chaque tâche indique la priorité, les fichiers, le changement exact et la commande de validation. Ne pas commencer une tâche avant que la validation de la précédente ne passe.

## Baseline

Exécuter avant toute modification : `cd backend && npm test && npm run check && cd ../frontend && npm test && npm run lint && npm run build`.

## Phase 0 — Produit et documentation

### T001 — Figer le périmètre MVP — P0
- Fichiers : `README.md`, `README_VENTE.md`, `plan.md`, `ROLES.md`.
- Changement : décider si Fleetly est une demande de réservation ou une réservation payée ; définir les statuts, règles d'annulation, rôles et fonctionnalités réellement livrées ; retirer les promesses non implémentées.
- Validation : `grep -R "fleet_manager\|customer\|5000\|VITE_API_BASE_URL" README.md README_VENTE.md plan.md ROLES.md` ne doit plus révéler de contradiction.

### T002 — Aligner les variables frontend — P1
- Fichiers : `frontend/.env.example`, `README.md`, `frontend/README.md`.
- Changement : remplacer `VITE_API_BASE_URL` par `VITE_API_URL`, documenter `http://localhost:5001/api` et la valeur de production.
- Validation : `grep -R "VITE_API_URL" README.md frontend/README.md frontend/.env.example`.

### T003 — Documenter les commandes — P1
- Fichiers : `README.md`, `backend/README.md`, `frontend/README.md`.
- Changement : documenter installation, MongoDB, seed, OAuth, tests, lint, build, variables obligatoires et limites connues.
- Validation : `git diff --check`.

## Phase 1 — Rôles et migration

### T004 — Unifier les rôles — P0
- Fichiers : `backend/models/user.js`, `backend/controllers/authSocialController.js`, `backend/controllers/userAdminController.js`, `frontend/src/context/AuthContext.jsx`, `frontend/src/components/auth/ProtectedRoute.jsx`, `frontend/src/components/auth/RoleGuard.jsx`.
- Changement : utiliser uniquement `user`, `agency_manager`, `admin`; remplacer toutes les créations et vérifications de `customer`, `fleet_manager`, `agent`.
- Validation : `grep -R "customer\|fleet_manager\|agent" backend frontend/src --include='*.js' --include='*.jsx'` ne doit laisser que l'historique de migration documenté.

### T005 — Sécuriser la migration de rôles — P0
- Fichiers : `backend/scripts/migrate-roles.js`, `backend/scripts/migrate-roles.README.md`.
- Changement : mapper `customer|finance_manager|support → user`, `agent|fleet_manager → agency_manager`, préserver `admin`; rendre la migration idempotente et afficher les compteurs.
- Validation : `node --check backend/scripts/migrate-roles.js`, puis deux exécutions sur une base de test.

### T006 — Mettre à jour fixtures et tests — P0
- Fichiers : `backend/test/helpers.js`, `backend/test/authSocial.test.js`, `backend/test/bookingAgent.test.js`, tous les tests trouvés par recherche de rôles.
- Changement : remplacer les anciennes valeurs et ajouter les cas de rejet des rôles invalides.
- Validation : `cd backend && npm test`.

### T007 — Corriger et rendre idempotent le seed — P0
- Fichiers : `backend/seed/demo.js`, `backend/package.json`.
- Changement : utiliser les rôles canoniques, limiter l'exécution au développement, réinitialiser uniquement les données de démo, éviter les collisions de branches/immatriculations et conserver des réservations visibles.
- Validation : `cd backend && node --check seed/demo.js && npm run seed`, puis relancer dans une base de test.

## Phase 2 — Authentification et autorisation

### T008 — Bloquer les comptes désactivés — P0
- Fichiers : `backend/middlewares/auth.js`, `backend/middlewares/role.js`, `backend/controllers/userController.js`.
- Changement : après validation du JWT, vérifier existence et `isActive`; appliquer la règle à `/users/me`.
- Validation : ajouter un test avec JWT valide d'un compte désactivé, puis `cd backend && npm test`.

### T009 — Centraliser permissions et hiérarchie — P0
- Fichiers : nouveau `backend/utils/permissions.js`, `backend/middlewares/role.js`, routes backend protégées.
- Changement : centraliser rôles, hiérarchie et helpers d'autorisation ; supprimer les chaînes contradictoires dans les routes.
- Validation : `cd backend && node --check middlewares/role.js && npm test`.

### T010 — Empêcher l'élévation par invitation — P0
- Fichiers : `backend/routes/userAdminRoute.js`, `backend/controllers/userAdminController.js`, `backend/validators/userAdminValidator.js`.
- Changement : seul `admin` peut inviter/assigner un admin ; un agency manager ne peut assigner que ses propres branches et des rôles non privilégiés.
- Validation : tests `agency_manager → admin` en 403 et `admin → admin` autorisé, puis `cd backend && npm test`.

### T011 — Corriger le périmètre véhicule — P0
- Fichiers : `backend/controllers/vehicleController.js`, `backend/controllers/vehicleAdminController.js`, `backend/controllers/branchController.js`.
- Changement : un agency manager ne peut créer, modifier, supprimer ou déplacer un véhicule que dans une branche assignée et active.
- Validation : tests positif/négatif sur deux branches, puis `cd backend && npm test`.

### T012 — Corriger le périmètre réservation — P0
- Fichiers : `backend/controllers/bookingAgentController.js`, `backend/controllers/bookingController.js`, `backend/routes/bookingAgentRoute.js`.
- Changement : encapsuler la restriction de branche dans un `$and` obligatoire ; une recherche par note ne doit jamais élargir le périmètre.
- Validation : test d'une note correspondant à une réservation étrangère, puis `cd backend && npm test`.

### T013 — Sécuriser les recherches — P1
- Fichiers : nouveau `backend/utils/search.js`, `backend/controllers/bookingAgentController.js`, `backend/controllers/userAdminController.js`, `backend/controllers/branchController.js`.
- Changement : échapper les regex utilisateur, limiter leur longueur, valider les ObjectId et les dates.
- Validation : tests regex, chaîne longue et identifiant invalide, puis `cd backend && npm test`.

## Phase 3 — OAuth et invitations

### T014 — Corriger la création OAuth — P0
- Fichiers : `backend/controllers/authSocialController.js`, `backend/services/googleAuth.js`, `backend/services/facebookAuth.js`.
- Changement : créer les comptes avec rôle `user`, vérifier email et état actif, gérer association et identifiants sociaux contradictoires.
- Validation : tests mockés de profil valide, email absent, compte existant et compte désactivé, puis `cd backend && npm test`.

### T015 — Ne plus placer le JWT dans l'URL — P0
- Fichiers : `backend/controllers/authSocialController.js`, `backend/routes/authSocialRoute.js`, `frontend/src/pages/AuthCallbackPage.jsx`, `frontend/src/api/endpoints.js`, `frontend/src/context/AuthContext.jsx`.
- Changement : remplacer `?token=` par un code d'échange court, à usage unique et expirant ; ajouter `state`; nettoyer l'URL après échange.
- Validation : tests code valide/expiré/réutilisé et state invalide ; `cd backend && npm test && cd ../frontend && npm test && npm run build`.

### T016 — Finaliser ou retirer les invitations — P1
- Fichiers : `backend/controllers/userAdminController.js`, `backend/routes/userAdminRoute.js`, `backend/validators/userAdminValidator.js`, frontend admin concerné.
- Changement : recommandé : token hashé, expiration, endpoint d'acceptation, choix du mot de passe, invalidation après usage ; ne jamais retourner de secret utilisable.
- Validation : tests expiration, double usage et changement de mot de passe, puis `cd backend && npm test`.

## Phase 4 — Modèle et validation

### T017 — Valider la création de véhicule — P0
- Fichiers : `backend/routes/vehicleRoute.js`, `backend/validators/vehicleValidator.js`, `backend/controllers/vehicleController.js`.
- Changement : appliquer le validateur à POST et couvrir champs obligatoires, prix, devise, branche, immatriculation, VIN, images, statut et nombres.
- Validation : tests de chaque champ invalide et d'un payload valide, puis `cd backend && npm test`.

### T018 — Ajouter le validateur réservation — P0
- Fichiers : nouveau `backend/validators/bookingValidator.js`, `backend/routes/bookingRoute.js`, `backend/controllers/bookingController.js`.
- Changement : valider ObjectId, dates, notes, idempotency key et valeurs autorisées avant traitement métier.
- Validation : tests payload incomplet/mauvais type/valide, puis `cd backend && npm test`.

### T019 — Valider les branches de réservation — P0
- Fichiers : `backend/controllers/bookingController.js`, `backend/models/branch.js`, `backend/models/vehicle.js`.
- Changement : vérifier existence, activité et cohérence des branches de prise en charge, retour et véhicule.
- Validation : tests branche inexistante/inactive/hors périmètre/valide, puis `cd backend && npm test`.

### T020 — Rejeter les dates passées — P0
- Fichiers : `backend/controllers/bookingController.js`, `backend/validators/bookingValidator.js`, `frontend/src/pages/public/VehicleDetailPage.jsx`, `frontend/src/components/booking/AvailabilityCalendar.jsx`.
- Changement : refuser dates passées côté API, documenter timezone et aligner calcul de jours avec les dates ISO du frontend.
- Validation : tests date passée, égalité, ordre inversé, changement d'heure et multi-jours ; `cd backend && npm test && cd ../frontend && npm test`.

### T021 — Uniformiser la suppression des branches — P1
- Fichiers : `backend/models/branch.js`, `backend/controllers/branchController.js`, `backend/routes/branchRoute.js`, `backend/validators/branchValidator.js`.
- Changement : recommandé : ajouter `isActive`, remplacer suppression physique par désactivation et exclure les branches inactives des listes/réservations.
- Validation : test désactivation, visibilité publique et réservation impossible, puis `cd backend && npm test`.

### T022 — Ne pas exposer les identifiants de flotte — P1
- Fichiers : `backend/controllers/vehicleController.js`, `backend/models/vehicle.js`, `frontend/src/pages/public/VehicleDetailPage.jsx`.
- Changement : créer un DTO public sans VIN ni immatriculation ; conserver le détail complet pour l'administration.
- Validation : test d'assertion sur la réponse publique, puis `cd backend && npm test`.

## Phase 5 — Intégrité des réservations

### T023 — Formaliser les transitions — P0
- Fichiers : nouveau `backend/utils/bookingStateMachine.js`, `backend/controllers/bookingController.js`, `backend/models/booking.js`.
- Changement : autoriser uniquement `pending_payment → confirmed|cancelled`, `confirmed → active|cancelled|no_show`, `active → completed|cancelled`; rendre les états finaux immuables.
- Validation : test de chaque transition valide et invalide, puis `cd backend && npm test`.

### T024 — Rendre la création atomique — P0
- Fichiers : nouveau `backend/services/bookingService.js`, `backend/controllers/bookingController.js`, `backend/models/booking.js`, `backend/config/connect.js`.
- Changement : déplacer disponibilité, idempotence et création dans un service transactionnel ou mécanisme atomique ; traiter les conflits concurrents.
- Validation : test de deux créations simultanées ; une seule doit réussir, puis `cd backend && npm test`.

### T025 — Finaliser l'idempotence — P0
- Fichiers : `backend/controllers/bookingController.js`, `backend/models/booking.js`, `frontend/src/pages/public/VehicleDetailPage.jsx`, `frontend/src/api/endpoints.js`.
- Changement : générer/envoyer toujours une clé côté frontend, la valider côté backend et retourner proprement la réservation existante.
- Validation : deux requêtes avec même clé produisent une seule réservation ; `cd backend && npm test && cd ../frontend && npm test`.

### T026 — Finaliser le flux réservation/paiement — P0
- Fichiers : `backend/models/booking.js`, `backend/controllers/bookingController.js`, `backend/routes/bookingRoute.js`, `frontend/src/pages/public/VehicleDetailPage.jsx`, `frontend/src/pages/user/BookingsPage.jsx`.
- Changement : selon T001, renommer le flux en demande de confirmation ou ajouter paiement, webhook, expiration, échec et remboursement ; afficher un statut compréhensible.
- Validation : tests de toutes les branches retenues, puis `cd backend && npm test && cd ../frontend && npm test && npm run build`.

### T027 — Ajouter l'annulation client — P1
- Fichiers : `backend/routes/bookingRoute.js`, `backend/controllers/bookingController.js`, `backend/validators/bookingValidator.js`, `frontend/src/api/endpoints.js`, `frontend/src/pages/user/BookingsPage.jsx`.
- Changement : autoriser le propriétaire selon une fenêtre documentée, enregistrer date/motif et empêcher les annulations interdites.
- Validation : tests propriétaire/autre utilisateur/terminée/délai dépassé, puis backend et frontend tests.

## Phase 6 — Pagination et analytics

### T028 — Utiliser les endpoints de détail — P1
- Fichiers : `backend/controllers/vehicleController.js`, `backend/controllers/branchController.js`, `backend/routes/vehicleRoute.js`, `backend/routes/branchRoute.js`, `frontend/src/api/endpoints.js`, `frontend/src/pages/admin/VehiclesForm.jsx`, `frontend/src/pages/admin/BranchesForm.jsx`.
- Changement : charger directement `GET /:id` au lieu de rechercher dans les 100 premiers éléments.
- Validation : éditer un élément au-delà de la première page ; `cd backend && npm test && cd ../frontend && npm run build`.

### T029 — Corriger profitability — P1
- Fichiers : `backend/controllers/analyticsController.js`.
- Changement : appliquer `skip`/`limit`, calculer la page demandée et retourner des métadonnées exactes.
- Validation : test avec plus de 100 véhicules et plusieurs pages ; `cd backend && npm test`.

### T030 — Corriger les métriques — P1
- Fichiers : `backend/controllers/analyticsController.js`, `frontend/src/pages/admin/AnalyticsPage.jsx`, `frontend/src/pages/admin/DashboardHome.jsx`.
- Changement : définir chevauchement de période, exclusion de la maintenance du dénominateur, statuts et devise.
- Validation : tests de réservations avant/pendant/après période ; `cd backend && npm test`.

### T031 — Ajouter API calendrier par période — P1
- Fichiers : `backend/controllers/bookingAgentController.js`, `backend/routes/bookingAgentRoute.js`, `frontend/src/api/endpoints.js`, `frontend/src/pages/admin/CalendarPage.jsx`.
- Changement : accepter `dateFrom`, `dateTo`, `branchId`, `vehicleId`, `status`; supprimer `limit: 1000` et charger la plage visible.
- Validation : vérifier plus de 100 réservations et filtres combinés ; backend tests et frontend build.

## Phase 7 — Parcours client frontend

### T032 — Connecter la recherche homepage — P1
- Fichiers : `frontend/src/pages/HomePage.jsx`, `frontend/src/pages/public/VehiclesPage.jsx`.
- Changement : rendre le widget contrôlé, valider dates, sérialiser branche/from/to dans `/vehicles`, restaurer les paramètres.
- Validation : test manuel et `cd frontend && npm test && npm run build`.

### T033 — Utiliser la disponibilité date-aware — P1
- Fichiers : `frontend/src/pages/public/VehiclesPage.jsx`, `frontend/src/api/endpoints.js`, `backend/controllers/vehicleController.js`.
- Changement : envoyer dates, utiliser `available`, désactiver CTA et afficher le motif d'indisponibilité.
- Validation : comparer période libre/réservée ; frontend tests/build.

### T034 — Résilientiser quote et création — P1
- Fichiers : `frontend/src/pages/public/VehicleDetailPage.jsx`, `frontend/src/utils/bookingDraft.js`, `frontend/src/utils/availability.js`.
- Changement : gérer expiration du devis, conflit 409, véhicule devenu indisponible, retry, clé idempotente et brouillon après login.
- Validation : tests utilitaires et simulation 409 ; `cd frontend && npm test`.

### T035 — Ajouter détail et actions client — P1
- Fichiers : `frontend/src/pages/user/BookingsPage.jsx`, `frontend/src/api/endpoints.js`, nouveau `frontend/src/pages/user/BookingDetailPage.jsx` si nécessaire.
- Changement : afficher référence, branches, statuts, montant, erreurs et annulation.
- Validation : chaque statut avec données de démo ; `cd frontend && npm test && npm run build`.

### T036 — Corriger filtres historique — P1
- Fichiers : `frontend/src/pages/user/BookingsPage.jsx`, `backend/controllers/bookingController.js`.
- Changement : ajouter filtre backend `status`, réinitialiser la page et afficher des compteurs cohérents.
- Validation : plusieurs pages et chaque statut ; backend/frontend tests.

### T037 — Corriger devise et localisation — P1
- Fichiers : `frontend/src/utils/format.js`, `frontend/src/pages/admin/DashboardHome.jsx`, `frontend/src/pages/admin/AnalyticsPage.jsx`, `frontend/src/pages/user/BookingsPage.jsx`, `frontend/src/pages/public/VehicleDetailPage.jsx`.
- Changement : utiliser locale active et devise de la réservation/véhicule pour dates et montants.
- Validation : tests unitaires et test manuel FR/EN/AR ; `cd frontend && npm test && npm run build`.

## Phase 8 — Dashboard et UX

### T038 — Restreindre `/admin` — P0
- Fichiers : `frontend/src/App.jsx`, `frontend/src/components/layout/DashboardLayout.jsx`, `frontend/src/context/AuthContext.jsx`.
- Changement : retirer `user` des rôles autorisés, rediriger clairement les non-staff et aligner menus/API.
- Validation : tester `user`, `agency_manager`, `admin`; `cd frontend && npm test && npm run build`.

### T039 — Ajouter états et filtres admin — P1
- Fichiers : `frontend/src/pages/admin/BookingsList.jsx`, `VehiclesList.jsx`, `BranchesList.jsx`, `UsersList.jsx`.
- Changement : recherche, statut, dates, branche, loading/error/empty, pagination et désactivation pendant mutation.
- Validation : tester API coupée, résultat vide, pagination et filtres ; `cd frontend && npm test && npm run lint && npm run build`.

### T040 — Ajouter filtres calendrier — P1
- Fichiers : `frontend/src/pages/admin/CalendarPage.jsx`, `frontend/src/api/endpoints.js`, `frontend/src/locales/fr.json`, `en.json`, `ar.json`.
- Changement : filtres branche/véhicule/statut, chargement par plage, traductions, états vide/erreur.
- Validation : changer mois/semaine et combiner filtres ; `cd frontend && npm test && npm run build`.

### T041 — Supprimer les liens fictifs — P1
- Fichiers : `frontend/src/pages/HomePage.jsx`, `frontend/src/pages/RegisterPage.jsx`, nouveau `frontend/src/pages/public/LegalPage.jsx` si nécessaire.
- Changement : implémenter ou supprimer `/about`, `/contact`, mentions légales, confidentialité, FAQ, CGU, newsletter et `href="#"`.
- Validation : parcourir tous les liens ; `cd frontend && npm run build`.

### T042 — Ajouter navigation mobile — P1
- Fichiers : `frontend/src/components/Header.jsx`, `frontend/src/components/auth/UserMenu.jsx`.
- Changement : menu mobile avec accueil, catalogue, locations, dashboard autorisé, langues et déconnexion ; clavier/ARIA.
- Validation : test mobile et clavier ; `cd frontend && npm run lint && npm run build`.

### T043 — Remplacer les erreurs console seules — P1
- Fichiers : `frontend/src/pages/user/BookingsPage.jsx`, `DashboardHome.jsx`, `VehiclesForm.jsx`, `VehiclesPage.jsx`, `VehicleDetailPage.jsx`, `frontend/src/context/AuthContext.jsx`.
- Changement : message traduit, état retry et état vide ; logs sans données sensibles uniquement.
- Validation : couper l'API et vérifier chaque écran ; `cd frontend && npm run lint && npm run build`.

## Phase 9 — Tests et qualité

### T044 — Corriger les avertissements React Hooks — P1
- Fichiers : pages signalées par ESLint : `AnalyticsPage.jsx`, `BookingsList.jsx`, `BranchesForm.jsx`, `BranchesList.jsx`, `CalendarPage.jsx`, `VehiclesForm.jsx`, `VehiclesList.jsx`, `VehicleDetailPage.jsx`, `VehiclesPage.jsx`, `BookingsPage.jsx`.
- Changement : `useCallback`, fonctions dans les effets ou dépendances corrigées sans boucles de requêtes.
- Validation : `cd frontend && npm run lint` doit produire zéro avertissement.

### T045 — Ajouter intégration backend — P0
- Fichiers : nouveaux `backend/test/integration/auth.integration.test.js`, `booking.integration.test.js`, `authorization.integration.test.js`, `seed.integration.test.js`.
- Changement : tester auth, comptes désactivés, RBAC, branches, conflits, concurrence, pagination, statuts et seed avec Mongo de test.
- Validation : `cd backend && npm test`.

### T046 — Ajouter intégration frontend — P1
- Fichiers : nouveaux tests sous `frontend/src/**/*.test.jsx`, configuration Vitest si nécessaire.
- Changement : couvrir login, route protégée, recherche, brouillon, quote, 409, annulation, permissions, calendrier et RTL.
- Validation : `cd frontend && npm test`.

### T047 — Ajouter smoke test E2E — P1
- Fichiers : nouveau `e2e/`, `playwright.config.*` ou outil retenu, `README.md`.
- Changement : automatiser visiteur → inscription → recherche → quote → réservation → admin → confirmation → calendrier.
- Validation : `npm run e2e`.

## Phase 10 — Production

### T048 — Renforcer l'environnement production — P0
- Fichiers : `backend/config/validateEnv.js`, `backend/.env.example`, `backend/app.js`, `backend/server.js`.
- Changement : origine de production obligatoire, URLs OAuth validées, secrets forts, proxy/HTTPS documentés, timeout de shutdown.
- Validation : démarrages avec variables absentes/invalides/valides et `cd backend && npm run check`.

### T049 — Améliorer logs et corrélation — P1
- Fichiers : `backend/utils/logger.js`, `backend/middlewares/httpLogger.js`, `backend/middlewares/requestId.js`, `backend/middlewares/errorHandler.js`.
- Changement : request ID, route, durée, statut, rotation, sortie standard production, aucune donnée sensible.
- Validation : vérifier le même request ID dans access/error logs ; `cd backend && npm run check`.

### T050 — Séparer liveness/readiness — P1
- Fichiers : `backend/controllers/healthController.js`, `backend/routes/healthRoute.js`, nouveau `backend/routes/readinessRoute.js`.
- Changement : readiness dépendant de MongoDB et réponses sans détails internes.
- Validation : Mongo disponible/indisponible ; `cd backend && npm test && npm run check`.

### T051 — Renforcer CI et audit dépendances — P1
- Fichiers : `.github/workflows/ci.yml`, `backend/package.json`, `frontend/package.json`.
- Changement : ajouter audit npm, tests d'intégration et lint bloquant après T044.
- Validation : `cd backend && npm ci && npm audit --audit-level=high && npm test && npm run check && cd ../frontend && npm ci && npm run lint && npm test && npm run build`.

### T052 — Documenter déploiement et récupération — P1
- Fichiers : nouveau `DEPLOYMENT.md`, `README.md`, `backend/.env.example`, `frontend/.env.example`.
- Changement : déploiement, MongoDB Atlas, CORS, OAuth callbacks, seed staging, backups, rollback, logs et rotation secrets.
- Validation : suivre le document depuis un environnement propre et `git diff --check`.

## Phase 11 — Release gate

### T053 — Suite complète — P0
- Fichiers : fichiers signalés par les commandes.
- Changement : corriger tous les échecs jusqu'à suite verte.
- Validation : `cd backend && npm ci && npm test && npm run check && cd ../frontend && npm ci && npm test && npm run lint && npm run build`.

### T054 — Matrice d'autorisation — P0
- Fichiers : tests backend/frontend, `ROLES.md`.
- Changement : vérifier pour chaque rôle catalogue, véhicules, branches, réservations, statuts, utilisateurs, calendrier et analytics ; réponses attendues 200, 401 ou 403.
- Validation : `cd backend && npm test`.

### T055 — Recette MVP — P0
- Fichiers : nouveau `ACCEPTANCE.md` ou section dans `README.md`.
- Changement : enregistrer recette desktop/mobile, FR/EN/AR, client/admin, erreurs API, conflit et refresh.
- Validation : `npm run e2e`.

### T056 — Geler la release — P0
- Fichiers : `README.md`, fichiers de version et lockfiles si nécessaire.
- Changement : renseigner version, commit, variables, limitations et rollback ; vérifier l'absence de secrets/logs versionnés.
- Validation : `git status --short` puis `git ls-files | grep -E '(^|/)(\.env|logs/|.*\.log$)' || true`.

## Critères de sortie MVP

- Rôles cohérents dans schéma, seed, API, frontend, tests et documentation.
- Comptes désactivés bloqués immédiatement.
- Dates passées et réservations chevauchantes refusées côté API.
- Aucune double réservation concurrente.
- Restrictions de branches impossibles à contourner.
- Parcours client et opérateur complets et testés.
- Calendrier complet, sans troncature silencieuse.
- Tests backend/frontend, lint, build et E2E passants.
- Production documentée : variables, logs, health checks, sauvegardes et rollback.
