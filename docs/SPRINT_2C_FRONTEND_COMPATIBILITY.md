# Sprint 2C Frontend Compatibility

## Interfaces officielles

- `frontend/admin-electoral.html` est l'interface officielle de saisie des résultats par PV.
- `frontend/admin.html` est le tableau de bord administratif principal.
- `frontend/admin-modern.html` reste un prototype non officiel et ne doit pas être utilisé comme interface de référence MVP.

## Session admin

Les interfaces officielles demandent le jeton admin à l'utilisateur et le gardent uniquement en mémoire JavaScript pendant la durée de la page.

- pas de `localStorage`;
- pas de `sessionStorage`;
- pas de jeton dans l'URL;
- pas de jeton codé en dur dans le HTML;
- envoi uniquement par l'en-tête `x-admin-token`;
- effacement à la déconnexion ou au rechargement.

La vérification de session utilise `GET /api/admin/recent`.

## Election active temporaire

Le MVP utilise une configuration frontend explicite:

- `ACTIVE_ELECTION_ID = 1`;
- nom affiché: `Election active MVP`;
- statut affiché: `Démonstration MVP`.

Cette valeur temporaire sera remplacée par une future API `GET /api/elections/active`.

## Routes utilisées

`frontend/admin-electoral.html`:

- `GET /api/admin/recent` pour vérifier le jeton;
- `GET /api/electoral/departments`;
- `GET /api/electoral/communes`;
- `GET /api/electoral/sections`;
- `GET /api/electoral/bvs`;
- `POST /api/submit-electoral-result`.

`frontend/admin.html`:

- `GET /api/admin/recent`;
- `GET /api/admin/parties`;
- `POST /api/admin/party`;
- `GET /api/admin/candidates`;
- `POST /api/admin/candidate`.

`/api/submit-results` reste uniquement une compatibilité backend dépréciée et n'est plus utilisée comme saisie principale.

## Limites restantes

- Aucun déploiement direct en production n'est autorisé après ce sprint.
- Les écrans n'ont pas encore été testés avec une base staging isolée.
- L'authentification reste un jeton simple et devra évoluer avant une exposition large.
- La liste des candidats de `admin-electoral.html` reste statique pour ce MVP et devra être reliée au référentiel candidats.
- `ACTIVE_ELECTION_ID = 1` doit être remplacé par une API d'élection active.

## Procédure de test

Depuis le worktree MVP:

```bash
git diff --check
node --check index.js
npm test
```

## Conditions avant staging

- Créer un environnement staging séparé de la production.
- Configurer un `ADMIN_TOKEN` de staging.
- Tester les lectures admin avec token absent, invalide et valide.
- Tester une saisie PV sur une base non production.
- Vérifier que les pages publiques ne nécessitent aucun jeton.
