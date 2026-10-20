# Forge rebuild — validation

This report covers the new local reconstruction only. It is not evidence about the original published Forge application.

## Automated API journey — passed

The test creates three controlled accounts and checks registration, unauthenticated access, project validation, profile persistence, self-interest rejection, owner-only deletion, saved projects, duplicate request prevention, owner-only request acceptance, conversation access, two-way message infrastructure, persistence after server restart, cascading project deletion and logout/session revocation.

## Browser checks — passed

Executed with Chromium via Playwright against an isolated SQLite database.

1. Register and open Discover.
2. Save a profile and retain its content after page reload.
3. Clear notifications when navigating to another tab.
4. Restore a project draft after page reload.
5. Cancel removes the draft after reopening and another reload.
6. Reject empty publication with actionable required-field messages.
7. Publish a project, retain it after reload, and hide self-interest controls.
8. Search, combine location/category/arrangement filters, and fit a 390px mobile viewport.
9. Save a project and retain it after reload.
10. Send interest from a second account, accept it as owner and exchange messages in both directions.
11. Delete the controlled project through the owner confirmation flow.
12. No uncaught browser JavaScript errors during the journey.

Browser screenshots and machine-readable results are in test-results/. Tests clean up their temporary database.

## Limits

No original-site migration, email delivery, real browser ChatGPT sign-in, load testing, full accessibility/security audit, automatic message push or real investment/payment execution was performed. The local runtime uses email/password authentication; the hosted Worker uses verified Sites identity. The visual and functional reconstruction is based on the supplied screenshots, product discussion and observed QA issues; the original source was unavailable.


## Hosted build checks — passed

The same 12 browser checks also passed against the bundled Worker, using the loopback preview adapter to simulate two independent ChatGPT identities. Additional Worker tests verified D1-style queries, unauthenticated rejection, duplicate requests, self-interest rejection, owner-only acceptance/deletion, accepted-only messages, conversation privacy, cross-origin rejection, MCP discovery and caller-bound MCP reads. Local adapters do not verify the external ChatGPT login service.
