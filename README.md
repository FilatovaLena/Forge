# Forge — testable rebuild

A standalone reconstruction of the Forge product from the supplied screenshots and requirements. It does not connect to, replace, or import records from the previous ChatGPT Site.

## Run

Requires Node.js 24 or later. No runtime packages, account connections or API keys are required.

```sh
cd forge
npm start
```

Open http://127.0.0.1:3000. Create an account with a test email and a password of at least 10 characters. Use a second browser profile/incognito window and a different account to test partner requests. The database starts empty deliberately; create your own clearly labelled test projects.

SQLite data persists in `data/forge.sqlite`. To select an isolated database, use `DB_PATH=/absolute/path/test.sqlite`. `PORT` defaults to 3000, `HOST` to 127.0.0.1. Project drafts are scoped to the signed-in user in browser localStorage. Cancel permanently discards the current draft; navigating away preserves it.

## Implemented

- Email/password registration and login, hashed passwords, expiring HttpOnly session cookies, logout.
- Profiles with entrepreneur/investor/specialist roles and saved resource descriptions.
- Publish, view and delete owned projects; title, category, location, stage, arrangement, description and needs.
- Search and combined filters; saved projects.
- Interest in another user's project, one request per pair/project, owner acceptance or rejection.
- Accepted matches and persistent two-way messages; use Refresh messages for new messages.
- Server-enforced ownership and conversation privacy; same-origin mutation checks.
- Responsive forest-green interface matching the existing Forge direction.

Investor participation is a profile/listing workflow, not payment processing, fundraising execution or an investment recommendation service. No transfers of money are supported.

## Automated checks

```sh
npm test
```

This uses temporary SQLite databases and a separate process. Covers two-account workflows, invalid requests, authorization, duplicate interest, message privacy, server-restart persistence and cascade deletion. No user database is touched.

For browser tests, install the pinned development dependency and a browser:

```sh
npm install
npx playwright install chromium
npm run test:browser
```

The runner uses `CHROMIUM_PATH` when supplied, otherwise Playwright's Chromium. It also uses isolated temporary data. Screenshots and a JSON result are saved to `test-results/`. The development environment may require permission to run a local HTTP server and browser.

```sh
CHROMIUM_PATH=/usr/bin/chromium npm run test:browser
```

## Hosted version — ChatGPT Sites

The hosted build uses the same UI with ChatGPT-owned sign-in and a D1 database. It does not collect passwords. The original Node.js + SQLite version remains available for offline development and two-account QA.

```sh
npm ci
npm run build
npm run test:hosted
npm run preview:hosted
```

`worker/index.js` is the hosted backend. `scripts/build-hosted.mjs` bundles the UI into one Worker ES module in `dist/server/index.js`, and copies the hosting manifest and generated Drizzle migrations. `.openai/hosting.json` retains the Site identity, `DB` binding and MCP capability. Do not replace the Site ID during updates.

The preview is loopback-only. `/_preview/login` simulates identity for tests in `scripts/preview-hosted.mjs`; it is **not** in the production Worker. Hosted requests use the verified `oai-authenticated-user-*` headers supplied by Sites. Do not deploy the preview adapter or expose it to the internet.

```sh
npm run test:browser:hosted
```

This runs the same 12 browser checks against the hosted Worker implementation with a local SQLite adapter for the D1 interface. It verifies application behavior, not the real cloud sign-in flow or production D1 availability.

## Codex integration

The hosted Worker exposes `/mcp` with eight tools: read your profile, list projects, list interests, create your project, update your profile, delete your project, read match messages and send a match message. Publishing the Site with the MCP capability provisions a personal plugin. Connect that plugin in ChatGPT/Codex to use the tools under your signed-in identity. Tools enforce the same ownership checks as the UI. No tool impersonates another user. `forge_get_messages` and `forge_send_message` require the `interest_id` of an accepted match. Identify the correct project and participant using `forge_list_interests` first. The signed-in user must be one of the two conversation participants. Reads and sends are denied for pending matches and unrelated users. Sends return a saved message ID; do not retry a successful send. Only delete controlled test projects or projects the user explicitly requests to delete.

## GitHub and CI

Source repository: https://github.com/FilatovaLena/Forge

The GitHub Actions workflow runs API checks, a hosted build, Worker tests and both browser journeys after pushes and pull requests. A local passing test is not proof that a remote Actions run has passed; inspect the run status separately.

## Production boundary

The Site starts private to its owner. It is a working beta; real financial transactions are outside its scope. No old application data is imported. New hosted data and local development data are separate.

Before public launch, add abuse reporting/moderation, backups and a privacy/retention policy. Local email/password mode additionally needs verified email and password recovery, distributed rate limiting and HTTPS with `COOKIE_SECURE=1`. Hosted sign-in is handled by ChatGPT. Do not use real financial or sensitive personal data during QA.

Do not commit `data/`, `.env`, local credentials or test account records.
