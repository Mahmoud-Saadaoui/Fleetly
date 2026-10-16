# Rôles et permissions (Fleetly)

Les rôles sont définis dans `backend/models/user.js` : `['customer', 'agent', 'fleet_manager', 'finance_manager', 'support', 'admin']`

## Accès Dashboard (frontend - sidebar)
| Rôle | Dashboard | Véhicules | Agences (branches) | Réservations | Utilisateurs | Calendrier | Analytique |
|---|---|---|---|---|---|---|---|
| customer | Non (non-admin) | Non | Non | Non | Non | Non | Non |
| agent | Oui | Non | Non | Oui | Non | Oui | Non |
| fleet_manager | Oui | Oui | Oui | Oui | Non | Oui | Oui |
| finance_manager | Oui | Non | Non | Non | Non | Non | Oui |
| support | Oui (via ProtectedRoute) | Non | Non | Non | Non | Non | Non |
| admin | Oui | Oui | Oui | Oui | Oui | Oui | Oui |

## Routes Backend

### Utilisateurs (admin)
- `GET /api/admin/users` – `admin, fleet_manager`
- `GET /api/admin/users/:id` – `admin, fleet_manager`
- `PATCH /api/admin/users/:id` – **admin** (changer rôle, branches, statut)
- `DELETE /api/admin/users/:id` – **admin** (soft delete)
- `POST /api/admin/users/invite` – `admin, fleet_manager`

### Réservations
- `POST /api/bookings/quote` – public (sans auth)
- `POST /api/bookings` – `customer, admin, agent`
- `GET /api/bookings/mine` – `customer, admin, agent`
- `PATCH /api/bookings/:id/status` – `admin, agent, fleet_manager`

### Réservations agent
- `GET /api/agent/bookings` – `agent, admin, fleet_manager` (filtrées par agence)

### Véhicules (public)
- `GET /api/vehicles`, `GET /api/vehicles/:id`, `GET /api/vehicles/:id/availability` – publics

### Véhicules (gestion)
- `POST /api/vehicles` – `admin, fleet_manager`
- `PATCH /api/vehicles/:id/status` – `admin, fleet_manager, agent`
- `PATCH /api/admin/vehicles/:id`, `DELETE /api/admin/vehicles/:id` – `admin, fleet_manager`

### Agences (branches)
- `GET /api/branches`, `GET /api/branches/:id` – publics
- `POST /api/branches`, `PATCH /api/branches/:id` – `admin, fleet_manager`
- `DELETE /api/branches/:id` – **admin**

### Analytics
- `GET /api/analytics/overview`, `GET /api/analytics/profitability` – `admin, fleet_manager, finance_manager`

## Explication concise
- **customer** : réserve, voit ses réservations (public + espace client)
- **agent** : gère réservations liées à ses agences, change statut réservations, voit calendrier/réservations
- **fleet_manager** : gère flotte (véhicules/agences), réservations, calendrier, analytics, liste utilisateurs
- **finance_manager** : voit analytics, accès restreint
- **support** : accès dashboard (selon config) mais peu de permissions backend
- **admin** : toutes permissions (dont gestion complète utilisateurs, suppression agences)
