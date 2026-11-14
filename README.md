# Observatory

An experimental browser-based interface for organising goals, work, dependencies and AI-assisted reasoning spatially.

**Status:** active prototype.

**Live build:** https://rxe-alt788.github.io/Observatory/

## Current build

- spatial map of linked work and life domains;
- node-level status, dependencies and priorities;
- daily-priority surfaces;
- browser-based JavaScript implementation with no build step required for the published prototype.

## Repository map

- `index.html` — primary interface
- `engine.js` — interaction and rendering logic
- `data.js` — current data model
- `app.html` — alternate application surface
- `today.html` — daily-priority view
- `shadow*` — experimental interface branch retained during consolidation

The repository is an active prototype rather than a packaged product. Experimental branches remain visible where they document the development path.


## The Commons

**The Commons** is the shared environment built on the Observatory spatial model.

- Live interface: https://rxe-alt788.github.io/Observatory/commons.html
- Product and spatial architecture: [COMMONS-ARCHITECTURE.md](COMMONS-ARCHITECTURE.md)
- Shared backend and sovereignty contract: [COMMONS-BACKEND-CONTRACT.md](COMMONS-BACKEND-CONTRACT.md)
- Interface: `commons.html`, `commons.css`, `commons.js`

The fixed Observatory region coordinates are preserved. The current browser build supports local artefacts, local identity registration, spatial navigation and direct invocation of an OpenAI-compatible model endpoint. It is a local-first prototype; multi-user persistence, authentication, shared presence and server-side secret management remain production requirements.
