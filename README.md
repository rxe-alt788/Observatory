# The Observatory · Shadow Field v2

A static, client-side prototype for source-preserving cognitive terrain mapping.

## Core proposition

**Utility is relational, not existential.**

The Shadow Field measures whether a state contributes to the immediate order. It does not treat immediate usefulness as the measure of whether a state deserves to exist.

A state may be:

- being;
- considering;
- attempting;
- trying;
- hidden;
- deferred;
- infecting or transmitting effects;
- conferring or enabling effects.

Those states can then be described separately as useful now, enabling, indeterminate, not useful now, or obstructive.

When a state is not useful to the immediate order but still has an intelligible role, it is retained as **legitimate remainder** with a stated function and a condition for re-entry.

## What changed from Shadow Field v1

V1 could allow the questionnaire to determine too much of the resulting field. V2 changes the order:

`source → observation → state/signal detection → relationship → candidate terrain → utility → possible action`

Prompt identity is retained as provenance but has no routing authority.

## Files

- `shadow.html` — public page entry point.
- `shadow.css` — presentation and responsive/mobile layout.
- `shadow.js` — source capture, transparent rules, 3D terrain, correction, Today and legitimate remainder.
- `ARCHITECTURE.md` — philosophical and technical architecture.
- `PROJECT_WORKFLOW.md` — full build workflow and status.
- `TESTS.md` — falsification and acceptance tests.
- `HITL_GATE.md` — the final human review before calling the draft complete.
- `DEPLOY_GITHUB.md` — browser and Git CLI upload/deployment instructions.

## Runtime

No build step and no backend are required.

The app uses Three.js from jsDelivr via an import map. User-entered source text and corrections are saved only to browser `localStorage` by this prototype.

## Local preview

From this folder:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000/shadow.html`.

Do not rely on opening the HTML directly with `file://`; module loading is more reliably tested through a local HTTP server.

## Public-repository note

Repository visibility and software licensing are separate decisions. This draft deliberately does not add a software licence. Select one explicitly before inviting reuse or contribution.
