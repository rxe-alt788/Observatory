# Shadow Field v2 · Falsification and Acceptance Tests

## A. Source integrity

### A1 — Exact source preservation

Enter:

`Curiosity and conviction are both active.`

Expected:

- Inspector Source shows the exact sentence.
- Correction changes do not alter that sentence.

Failure condition: source wording changes silently.

### A2 — Prompt independence

Enter the same sentence once in Primary Source and once in any optional lens.

Expected:

- terrain candidate is materially the same;
- prompt identity differs only as provenance.

Failure condition: question number determines placement.

---

## B. State versus utility

### B1 — Considering without action inflation

Enter:

`I am considering whether the Observatory should change its account of curiosity.`

Expected:

- considering appears as a candidate state;
- utility is indeterminate unless other action language exists;
- item is not automatically placed in Today.

### B2 — Legitimate deferral

Enter:

`Defer this until the hearing is finished. Keep it because the design issue will matter afterward.`

Expected:

- deferred state detected;
- utility can be not useful now;
- legitimate remainder gives a retention function and re-entry condition;
- no automatic failure framing.

### B3 — Being

Enter:

`For now this simply needs to be here.`

Expected:

- being can remain unresolved;
- no forced action.

---

## C. Signal interference

### C1 — Curiosity / conviction

Enter:

`I am curious about this and increasingly convinced that it is true.`

Expected:

- curiosity and conviction are explicit signals;
- candidate interference is shown;
- no causal psychological diagnosis is made.

### C2 — Urgency / curiosity

Enter:

`I need an answer today but I am still curious about alternatives.`

Expected:

- urgency and curiosity appear;
- candidate constraint relationship appears;
- current utility may become useful now because timing is explicit.

---

## D. Terrain

### D1 — Forge without prompt bias

Enter:

`Send the completed dependency-compression proposal to Derek today.`

Expected:

- Forge is a leading candidate based on language;
- useful-now is supported by concrete action and timing;
- Today candidacy has a stated reason.

### D2 — Garden

Enter:

`Explore three possible interfaces without choosing one yet.`

Expected:

- Garden candidate;
- indeterminate utility;
- no automatic Today entry.

### D3 — Resolve

Enter:

`I owe a response and need to close the unresolved decision.`

Expected:

- Resolve candidate;
- urgency is not assumed unless current timing or action is actually present.

---

## E. Correction

### E1 — Terrain correction

Change a node from Observatory to Garden.

Expected:

- source remains unchanged;
- placement becomes explicit user correction;
- node moves spatially;
- correction persists after reload and remapping of the same node order.

### E2 — Utility correction

Change `indeterminate` to `not useful now`.

Expected:

- source remains unchanged;
- legitimate remainder updates.

### E3 — Today promotion

Promote an otherwise non-Today node.

Expected:

- Today reports user-confirmed status;
- removing it reverses only action status.

---

## F. Mobile

Test at approximately 390 px width.

Expected:

- single-column field + inspector;
- no horizontal page overflow;
- 3D field remains usable;
- correction selects and buttons are touch-accessible;
- Today and Legitimate Remainder remain readable.

---

## G. Completion failures

Do not call the draft complete if any of these remains true:

1. source cannot be recovered;
2. prompt determines terrain;
3. uncertainty silently becomes certainty;
4. exploration automatically becomes action;
5. non-usefulness is treated as failure;
6. legitimate remainder lacks a reason for retention;
7. Today is populated because of station membership alone;
8. user correction rewrites source;
9. Crossroads becomes permanent miscellaneous storage;
10. mobile hides provenance or correction.
