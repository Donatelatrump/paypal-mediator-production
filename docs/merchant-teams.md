# Merchants are teams

An authenticated account can create and belong to multiple merchants. Each merchant is an independent team, with its own memberships, roles, policies, transactions, disputes and evidence. Creating an account does not automatically create a team.

## Account routes

These routes require a Supabase user bearer token, but no existing membership or selected team:

| Method | Path                                   | Behavior                                                                                                   |
| ------ | -------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| GET    | `/api/merchants`                       | List only the user's active memberships. Returns `{ "items": [] }` for a first-time user.                  |
| POST   | `/api/merchants`                       | Create a team using `{ "displayName": "My team" }`. Atomically creates an ADMIN membership for the caller. |
| GET    | `/api/merchant-invitations`            | List unexpired pending invitations addressed to the signed-in user's email.                                |
| POST   | `/api/merchant-invitations/:id/accept` | Accept an invitation addressed to that user and create/reactivate their membership.                        |

The API derives the user ID and email from a verified Supabase JWT. Keep Supabase email confirmation enabled for email-based invitations. Clients cannot choose an identity or grant their own role. Invitations expire after seven days. An invitation is consumed once, including concurrent acceptance attempts. Acceptance does not change an existing active member's role.

## Selected team routes

Send `X-Merchant-Id: <team UUID>` with requests for team resources, including transactions, disputes, settings, activity and integrations. The API rechecks active membership and the role for that specific team on every request. It rejects malformed IDs with 400 and unauthorized selection with 403. Accounts with multiple teams must select one (400 `MERCHANT_SELECTION_REQUIRED` otherwise). Accounts with exactly one active membership retain the existing header-free behavior.

Admin-only membership routes:

| Method | Path                             | Behavior                                                                                                             |
| ------ | -------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| GET    | `/api/merchants/members`         | List active members of the selected team.                                                                            |
| GET    | `/api/merchants/invitations`     | List pending invitations for that team.                                                                              |
| POST   | `/api/merchants/invitations`     | Invite with `{ "email": "member@example.com", "role": "VIEWER" }`. Role defaults to VIEWER; ADMIN is also supported. |
| DELETE | `/api/merchants/invitations/:id` | Revoke a pending invitation within the selected team.                                                                |

Invitations are persisted and appear in the recipient's account invitation list. This increment does not send email; it does not pretend an email was delivered. Member removal and role editing are outside these endpoints.

`MERCHANT_ID` now identifies the team attached to the existing server-configured PayPal Sandbox/webhook integration. It does not restrict team membership. Newly created teams do not inherit another team's PayPal credentials or connection status. Per-team PayPal onboarding remains a separate integration requirement.

## Persistence and rollout

Run `pnpm db:generate` and `pnpm db:deploy` before using the new routes. Migration `20261110000000_merchant_teams` adds invitations with RLS and a unique `(merchant_id, auth_user_id)` membership constraint. If an existing database contains duplicate memberships for that pair, reconcile them before deployment; the migration intentionally fails rather than deleting membership records automatically.

Only apply migrations to the intended environment. Local validation uses disposable PostgreSQL and signed test JWTs, with no production database or PayPal writes.

The frontend must load `/api/merchants`, handle the empty list with team creation/invitations, and include the selected team ID with all resource requests. This backend increment does not change the frontend screens.

## Validation for this increment

The new merchant module is tested through its real NestJS controllers, signed JWT/JWKS authentication, and disposable PostgreSQL. The full application regression suite currently cannot initialize because `IntegrationsModule` imports an undefined `JobsModule` through a circular dependency. Existing seed, integration and jobs code also fails repository-wide lint/type checks. These pre-existing failures are not bypassed or reported as successful validation. Production migration and deployment have not been performed.
