# Staging Environment

## Architecture

The staging environment must run separately from production:

- code: `/home/juno7admin/worktrees/juno7-elections-mvp`;
- app port: `3100`;
- PM2 process: `juno7-elections-staging`;
- database: `juno7_elections_staging`;
- database user: `juno7_elections_staging_app`;
- optional host: `staging-elections.juno7.ht`;
- environment file: `.env.staging`, not committed.

Production remains `/home/juno7admin/apps/juno7-elections` on port `3000`.

## Variables

Use `.env.staging.example` as a template. Required variables:

- `NODE_ENV=staging`
- `PORT=3100`
- `DATABASE_URL`
- `ADMIN_TOKEN`
- `STAGING=true`

Never copy production `.env` values. The staging database name must clearly contain `staging`.

## Startup Guardrails

When `NODE_ENV=staging`, startup is refused if:

- `STAGING` is not `true`;
- `PORT` is `3000`;
- `DATABASE_URL` is missing;
- the database name extracted from `DATABASE_URL` does not contain `staging`;
- `ADMIN_TOKEN` is missing or still contains a placeholder such as `CHANGE_ME`.

Errors do not print the database URL or token.

## Validation Commands

```bash
npm run check
npm test
npm run validate
```

The official test command targets only `tests/*.test.js`.

## Legacy `test.js`

The root `test.js` file is an old prototype server. It is syntactically invalid and starts its own app directly, so it is not part of the official test suite. It should be archived or repaired in a later sprint.

## Database Safety

Do not use the production `DATABASE_URL` for staging or write tests. The future staging database must be created with a dedicated role and limited privileges.

Before any write test, verify the target database name and reject any connection whose database name does not contain `staging`.

## Future Dependency Installation

After validation, install isolated dependencies in the MVP worktree:

```bash
npm ci --omit=dev --ignore-scripts
```

Do not rely on production `node_modules` for a long-running staging process.

## Future PM2 Procedure

Future command shape:

```bash
NODE_ENV=staging PORT=3100 pm2 start index.js --name juno7-elections-staging
```

The real command should load `.env.staging` without printing secrets.

## Future Nginx Procedure

Create a separate vhost for `staging-elections.juno7.ht` that proxies to `127.0.0.1:3100`.

Required protections:

- Basic Auth;
- `X-Robots-Tag: noindex, nofollow`;
- separate access and error logs;
- no changes to `elections.juno7.ht`.

## Rollback

If staging setup fails:

1. stop and delete only `juno7-elections-staging`;
2. disable only the staging Nginx vhost;
3. drop only the staging database and role after confirmation;
4. remove `.env.staging`;
5. keep production untouched.
