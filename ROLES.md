# Rôles et permissions (Fleetly)

Rôles : `user`, `agency_manager`, `admin`

## Dashboard (sidebar)
| Rôle | Dashboard | Véhicules | Agences | Réservations | Utilisateurs | Calendrier | Analytique |
|---|---|---|---|---|---|---|---|
| user | Non | Non | Non | Non | Non | Non | Non |
| agency_manager | Oui | Oui | Oui | Oui | Non | Oui | Non |
| admin | Oui | Oui | Oui | Oui | Oui | Oui | Oui |

## Routes clés
- Booking : quote public, créer/lister mes réservations (`user,admin,agency_manager`), changer statut (`admin,agency_manager`)
- Réservations agence : `agency_manager,admin`
- Véhicules : créer/changer statut (`admin,agency_manager`) ; édition/suppression admin routes (`admin,agency_manager`)
- Agences : CRUD sauf delete réservé à `admin` (selon routes)
- Users admin : liste/details/invite (`admin,agency_manager` ? avant), MAJ/suppression (`admin`)
- Analytics : uniquement `admin`
