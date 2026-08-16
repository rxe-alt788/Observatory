# Shadow Field v2 · Architecture

## 1. Philosophically heaviest insight

### Utility is relational, not existential

A state can be measured as useful or non-useful **relative to an immediate order** without that measurement becoming a verdict on the legitimacy of the state itself.

This changes the ontology of the Observatory.

A conventional productivity system tends to reduce material to a binary:

`useful → act`

`not useful → remove`

Shadow Field v2 instead uses two independent questions:

1. **What state is this material in?**
2. **What relation does that state currently have to the immediate order?**

The state may be being, considering, attempting, trying, hiding, deferring, infecting/transmitting, or conferring/enabling.

Its current utility may be useful now, enabling, indeterminate, not useful now, or obstructive.

The crucial category is **legitimate remainder**:

> material that is not presently useful to the immediate order but whose continued existence can still be rationally described.

The system therefore measures non-usefulness without converting it into failure.

Examples:

- consideration may preserve uncertainty;
- deferral may prevent premature conversion into action;
- trying may generate information even when no output results;
- simple being may preserve continuity without production;
- hidden material may be avoidance, containment, or unresolved exposure and should not be collapsed into one explanation;
- conferring or infecting/transmitting states may matter through their effects on other states rather than through direct output.

The resulting path is:

`state → current utility → reason → legitimate function outside immediate order → condition for re-entry`

This is the heaviest design constraint in v2. Every later interface and classification decision follows from it.

---

## 2. Governing epistemic rule

`SOURCE → OBSERVATION → INFERENCE → RELATIONSHIP → REPRESENTATION → ACTION`

No downstream layer may silently overwrite an upstream layer.

### Source

Exact user-supplied material.

### Observation

Directly observable properties of the material or its provenance.

### Inference

A candidate signal, state, utility relation or terrain placement.

### Relationship

A candidate connection between source-derived objects.

### Representation

A structured way to inspect the field.

### Action

A possible movement supported by sufficient evidence.

---

## 3. Data model

Each source-derived node contains:

```text
id
sourceId
sourcePrompt
rawText
observation
signals[]
internalStates[]
interference[]
placement {
  station
  confidence
  reason
  alternatives[]
}
utility {
  class
  confidence
  reason
  peripheralFunction
  reentry
}
actionStatus
position
```

Corrections are stored separately from source.

The source is never rewritten by correcting an inference.

---

## 4. Terrain

Candidate terrain remains:

- Observatory
- Garden
- Forge
- Harbour
- Resolve
- Archive
- Compost

Crossroads is primarily a relationship class, not permanent storage.

### Observatory

Observation, diagnosis, orientation and pattern recognition.

### Garden

Exploration, experiment and cultivation without a fixed completion state.

### Forge

Bounded action with an identifiable output or finish condition.

### Harbour

Conditions that enable continued functioning and deserve protection from indiscriminate urgency.

### Resolve

Live obligations, claimants, decisions, repairs or closure.

### Archive

Retained without current obligation.

### Compost

A present claim on attention may have ended; value can remain without duty to resurrect it.

---

## 5. State layer

Initial state vocabulary:

- being
- considering
- attempting
- trying
- deferred
- hidden
- conferring
- infecting

This vocabulary is deliberately independent of terrain.

For example, an item can be:

`state: considering`

`terrain: Garden`

`utility: indeterminate`

or:

`state: deferred`

`terrain: Resolve`

`utility: not useful now`

No state automatically determines its station or utility.

---

## 6. Signal layer

Initial explicit-signal vocabulary:

- interest
- curiosity
- conviction
- uncertainty
- obligation
- pressure
- urgency
- aversion
- recurrence
- attraction

Signals are overlays, not destinations.

Signal interference is separately represented. Current transparent rules include:

- curiosity ↔ conviction;
- uncertainty ↔ conviction;
- interest ↔ obligation;
- urgency ↔ curiosity.

The relationship is candidate analysis, never a declaration of cause.

---

## 7. Immediate order

The immediate order contains material for which movement, protection, resolution or delivery currently matters.

Utility classes:

### useful-now

A concrete or time-bound movement signal exists.

### enabling

The state supports other activity without itself being a direct output.

### indeterminate

The inquiry or state has not yet produced a defensible stopping condition.

### not-useful-now

The state currently sits outside the immediate order.

### obstructive

The state appears to block a live dependency or movement.

These classes do not express moral worth, truth, importance or personal value.

---

## 8. Legitimate remainder

A state enters legitimate remainder when:

- it is not presently useful to the immediate order or its utility remains indeterminate;
- there is still an intelligible reason to retain it;
- the system can state a re-entry condition or acknowledge that the condition is unresolved.

The interface therefore reports:

- current utility;
- reason;
- outside-order function;
- re-entry condition.

This prevents Archive, Compost and Garden from degenerating into prettier labels for failure or procrastination.

---

## 9. Today

Today is not a station.

It is a derived subset of the immediate order.

An item may enter Today when the source or user correction establishes:

- current timing;
- a concrete movement;
- a material protection condition;
- explicit user promotion.

Station membership alone is insufficient.

Default maximum: four items, with three preferred.

---

## 10. Human correction

The Inspector exposes:

- source;
- observation;
- state;
- signal;
- signal interference;
- utility;
- legitimate function;
- re-entry condition;
- candidate terrain;
- alternatives;
- relationships;
- correction controls.

User correction can alter terrain, utility or Today status without altering source.

---

## 11. Model boundary

The current public prototype uses transparent client-side rules.

A later model-assisted version may improve decomposition and semantic relationship detection, but a model must not be allowed to:

- alter source;
- silently set final priority;
- silently promote to Today;
- erase material;
- convert uncertainty to certainty;
- declare psychological cause from weak evidence.

A model may analyse the field. It does not own the field.

---

## 12. Completion criterion

The system succeeds when it can say, without contradiction:

> This state is not useful to what must happen now.
>
> It still has a legitimate place here.
>
> This is why.
>
> This is what would cause us to reconsider its position.

That sentence is the architectural landing point for Shadow Field v2.
