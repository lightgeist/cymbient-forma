# Cymbient Forma: Architecture and Figma replacement roadmap

**Status (2026-10-26):** working internal pilot deployed at [forma.aifpd.com](https://forma.aifpd.com). Not yet a secure multi-tenant or feature-complete Figma replacement. Source: [Cymbient Forma](https://github.com/lightgeist/cymbient-forma). Upstream: [DeepanshuMishraa/sheet](https://github.com/DeepanshuMishraa/sheet), AGPL-3.0-or-later.

## Technical thesis

The leverage is **structured, editable web UI shared between a person and an agent**. The agent acts on typed, versioned document transactions, not arbitrary screenshots or pixel clicks. This is materially different from simply wrapping an LLM around Figma's interface.

```text
Browser canvas (React 19, Vite)
    │
    ├─ packages/editor: interactions, panels, inspector, history, export
    ├─ packages/shell: file browser, preferences and onboarding
    │
    ▼
HTTP /api/rpc/* (oRPC) ◄──── MCP tools /mcp (agent side)
    │                              │
    ├──────── Typed RPC / transaction operations
    ▼
packages/canvas
  WebDocument model, pages, frames, DOM/CSS authoring,
  validation, merging, diffs, imports/exports, React rendering
    │
    ├─ packages/rpc: storage, history, drafts, comments, assets
    ├─ packages/realtime: local in-process event bus → SSE
    ▼
SQLite + Drizzle (user, design, design_draft, design_version,
                 canvas_transaction, asset, design_comment, etc.)
```

### What the inspected code actually contains

| Area | Implemented foundation | Principal files |
|---|---|---|
| Web-native design graph | DOM/CSS authoring, pages, frames, components, materials, model validation, merge/diff | `packages/canvas/src/web-model.ts`, `web-frames.ts`, `web-components.ts`, `web-merge.ts` |
| User editor | Tools, layers, inspector, assets, comments UI, preview, version history, export menu | `packages/editor/src/components/web-editor.tsx`, `web-history.tsx`, `assets-panel.tsx`, `comments.tsx` |
| API and agent automation | oRPC procedures, protected MCP adapter, typed editing and document operations | `packages/rpc/src/router.ts`, `mcp-server.ts`, `web-canvas-procedures.ts`, `apps/mcp/src/local.ts` |
| Durable state | Design records, drafts/versions, canvas transactions, assets, comments | `packages/db/src/schema.ts` |
| Realtime notifications | Process-local event fanout and SSE | `packages/realtime/src/local-bus.ts`, `apps/mcp/src/local.ts` |
| Hosted perimeter (Forma adaptation) | Cloudflare HTTPS, Basic team gateway, independent MCP Bearer gate, fail-closed paths, loopback listener | `apps/mcp/src/forma-web.ts`, `apps/mcp/src/forma-web.test.ts`, `deploy/RELEASE.md` |

Upstream's README documents **35 MCP tools**, drafts/history and one-way exports to HTML, React/TSX, JSON and PNG. The existence of code and unit tests does not prove each export works in the deployed browser.

### Architectural constraints

**One local user, not a team data model.** The `user` schema exists, but the local-mode server calls `ensureLocalUser()` and uses the shared local user. Basic authentication wraps that single identity. It does not implement team memberships, file-level authorization, project isolation, separate home pages or user audit trails.

**Realtime events, not true multiplayer.** `packages/realtime/src/local-bus.ts` keeps an in-memory `Set` of callbacks and filters by design/draft. This allows change notifications but does not guarantee correct concurrent co-editing, cursor presence, offline merges, operation synchronization across several servers, or CRDT semantics.

**SQLite is a good pilot baseline, not a scale strategy alone.** Versions and transactions provide a durable base. Multi-node deployments would need a shared authoritative store plus transactional sequencing and a durable fanout layer. The immediate need is correct access control, not a speculative database migration.

**Visual parity is a different problem from agent parity.** Figma users depend on polished constraints/auto-layout, vectors/pen paths, nested reusable components, variables/themes, prototyping, commenting, inspections, import/export and multiplayer. Agent editing of structured HTML is a differentiator, not a substitute for these workflows.

## Replacement program — evidence-gated build order

| Stage | Target deliverable | Launch gate: observed user outcome |
|---|---|---|
| **P0: identity and data safety** | SSO/OIDC, organizations, teams/projects, sessions, RBAC + per-design authorization on every RPC/MCP route, audit, safe sharing | Two distinct users: owner edits; viewer cannot modify; unrelated org cannot read; revoking access immediately works; audit shows actor |
| **P0: durable design jobs** | Create/frame/text/image/layout editing and export pass in two browsers, automatic save with conflict feedback, backup/restore drills | Complete real Cymbient landing page and BrightClass screen, export working React+assets; restore DB and reopen same screens |
| **P1: collaboration** | Design-scoped concurrency control / operation log then presence, cursors, comments/replies, resilient reconnect; CRDT or OT only where the chosen model needs it | Two editors concurrently edit different nodes and same node; no silent lost update; reconnect and history recovery |
| **P1: reusable systems** | Shared component libraries, variants, tokens, typography grids, responsive rules; import existing Cymbient/BrightClass design systems | A library change safely updates several projects; design compiles to implementation preserving tokens/constraints |
| **P1: migration / handoff** | SVG, assets, CSS/React import plus practical Figma migration path where format/API allows; design-to-dev preview/diff/inspect | A real sample design migrates, edits successfully, and exports predictable code/screenshots at multiple viewports |
| **P2: advanced creation** | Pen/vector ops, prototyping and interactions, polished constraints/auto-layout, plugins and extended design ops | Design team completes one representative Figma project entirely in Forma and measures switching cost |
| **P2: scale and governance** | Managed object assets/backups, rate limits, multi-node design state, monitoring, retention and restore, enterprise policies | Load and failure tests under real concurrency; isolated environments and recoverable assets |

**Avoid first:** a pixel-perfect Figma homepage, speculative AI chat chrome or a wholesale rewrite of the document engine. Invest first in identities, proven save/export, edit fidelity and safe collaboration.

## Production deployment actually running

```text
https://forma.aifpd.com
    → Cloudflare Tunnel, rack systemd user service
      → 127.0.0.1:4184, Bun v1.4.0
        → React/Vite app + /api/rpc + /mcp + SSE
          → /srv/atlas/cymbient-forma-release/data/forma.db
```

- Source and public license offer: https://github.com/lightgeist/cymbient-forma
- Rack checkout: `/srv/atlas/cymbient-forma-release`.
- Service: `systemctl --user status cymbient-forma.service`; tunnel: `systemctl --user status cymbient-forma-tunnel.service`.
- Auth: Browser Basic user `team` with rack-only credential; MCP has a separate secret. This is **only suitable for a small trusted internal pilot**; all team members share the same upstream data identity.
- Frontend Docker image build was abandoned after rack disk I/O contention; native Bun was verified and adopted.

## Verification ledger — what was actually tested

| Check | Result | Evidence |
|---|---|---|
| Public HTTPS reaches rack | Pass: `/ready` returned 200; no-auth `/app` returned 401 and `/mcp` returned 404 | External curls from Mac and rack |
| Browser creates a design | Pass: Chrome created a real design record, visible in dashboard | `docs/evidence/prod-created.png`, `prod-list.png` |
| Saved file reopens | Pass: page refresh, dashboard → reopened file, second separate Chrome context | `docs/evidence/prod-e2e-result.json`, `prod-second-browser.png` |
| Data survives app restart | Pass: user service restarted (PID changed); SQLite design count stayed 1; health returned 200 | Rack systemd + direct DB count |
| Hosted security unit checks | Pass: 8/8 focused tests on hosted gate/runtime | `apps/mcp/src/forma-web.test.ts` |
| Upstream full test suite | **Not all passing:** baseline run had 339 passed / 18 failed, before adaptation | See original checkout test logs; do not label full suite green |
| Frame/text insertion, visual export, multi-user conflict handling | **Not fully verified in this release** | Must run full interactive acceptance before Figma-replacement promise |

**Recommendation:** start as an agent-native design pilot, not as a Figma shutdown. Assign several designers real tasks for an evidence-gated acceptance cycle. Only migrate the rest of the team once P0 safety, export quality and concurrency pass.
