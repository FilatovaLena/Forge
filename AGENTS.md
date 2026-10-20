# Forge workspace

This is a local rebuild for autonomous testing. Preserve the original remote Forge Site and its data.

- Read README.md before running or changing the application.
- Use Node 24+. Local runtime uses built-in node:sqlite. Hosted runtime uses Cloudflare D1 and ChatGPT-owned identity.
- Run `npm test` after server behavior changes and `npm run test:browser` after UI/workflow changes.
- Tests must use isolated temporary databases, two controlled accounts and clearly labelled test projects. Never message real people or use production records in tests.
- Do not mark screenshots/user-reported behavior as independently executed tests.
- Keep authorization checks on the server. Never accept owner/user IDs from the browser as authority.
- Keep user strings escaped in UI. No inline scripts or eval.
- Keep data/, test-results/, secrets and node_modules out of version control.
- No payment or securities transaction execution is implemented.

- Hosted source is worker/index.js. Run npm run build and npm run test:hosted after hosted backend changes, and npm run test:browser:hosted for hosted UI workflows.
- Never include scripts/preview-hosted.mjs in production artifacts or bypass Sites identity.
- Preserve .openai/hosting.json project_id, database binding, access audience and migration history.
