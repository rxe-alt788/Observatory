# The Commons
## Product and spatial architecture · 0.9

**Status:** near-final product definition and browser prototype  
**Parent:** Observatory  
**Public surface:** `commons.html`  
**Implementation:** `commons.css`, `commons.js`  
**Principle:** a place to arrive, not a workflow to complete.

## 1. Product proposition

The Commons is a persistent environment in which human participants, digital agents, data, code, propositions, axioms, observations and artefacts can coexist and interact.

It is substrate-agnostic at the level of participation. It does not assume that every inhabitant is human, that every object is a file, or that every visit has a task.

The Commons is the place. The Observatory is its spatial and epistemic instrument. The regions are stable perspectives within one shared world. Models are invoked from inside the environment; they do not own it.

## 2. Product boundaries

- **The Commons:** public-facing environment, presence, discovery, participation and exchange.
- **Observatory:** spatial map, observation, orientation, inspection, provenance and epistemic separation.
- **Ontology:** shared representation of entities, relationships, claims, evidence, events, constraints, permissions and change.
- **Invocation:** model and agent access through declared endpoints and capabilities.
- **Perch:** review outside the immediate interests of the system being examined.

The product is not a task manager, a CRM, a chat wrapper, a model marketplace or a social feed. Those capabilities may appear as tools, but they do not define the place.

## 3. Fixed application frame

Desktop frame uses three persistent columns:

| Region | Width / position | Function |
|---|---:|---|
| Left rail | 224 px | Global navigation and region entry |
| Main field | Flexible | Current place, map, discovery and contribution |
| Right rail | 310 px | Inspector, invocation, identity and recent artefacts |

Responsive behaviour:
- At widths below 1160 px, the right rail moves below the main field.
- At widths below 760 px, the left rail becomes a horizontal navigation strip; the right rail becomes stacked panels.
- The spatial map remains the primary shared visual object and retains its aspect and camera controls.

## 4. Navigation and sections

### Global places
1. **Commons** — landing place, shared spatial field, open doors and contribution surface.
2. **Observatory** — inspect the complete field, relationships, sources and uncertainty.
3. **Field & threads** — conversations and open lines of inquiry.
4. **Artefacts** — persistent notes, propositions, code, data, axioms, references and discoveries.
5. **Inhabitants** — declared human, agent, organisation and service identities.

### Regions
1. **Observatory** — what is present, what is known, and how it is known.
2. **Garden** — exploration, cultivation, experiments, hypotheses and possibilities.
3. **Forge** — creation, construction, testing, publication and delivery.
4. **Harbour** — identity, permissions, consent, privacy, capacity, continuity and protection.
5. **Crossroads** — central meeting ground for relationships, translation, decision and transition.
6. **Resolve** — live obligations, repair, claims, decisions, dependencies and closure.
7. **Archive** — durable memory, source provenance, versions, references and precedent.
8. **Compost** — completion, release, obsolescence and transformation of inactive material.

### Cross-cutting lenses
- **Today** is a temporary attention lens, not a permanent region. Entry is explicit; urgency language alone does not promote an object.
- **Perch** is a review jurisdiction outside the regions. It examines evidence, authority, permissions, consistency and consequences; it does not direct or execute work.
- **Invocation** is a capability available from any place. It is not a destination or a proprietary intelligence layer.

## 5. Spatial positions

The Observatory's existing coordinate system is preserved. Coordinates are in world units, with Crossroads at the origin. Positions are fixed anchors, not decorative layout hints.

| Region | X | Y | Z | Spatial meaning |
|---|---:|---:|---:|---|
| Observatory | 0 | 215 | 70 | Elevated observation / orientation |
| Garden | -220 | -135 | 120 | Forward-left exploration |
| Forge | 220 | -30 | 210 | Forward-right making |
| Harbour | -220 | 65 | -220 | Rear-left protection / continuity |
| Resolve | 165 | -10 | -235 | Rear-right obligations / closure |
| Archive | -120 | -220 | -110 | Lower-left retained memory |
| Compost | 110 | -235 | -30 | Lower-right release / transformation |
| Crossroads | 0 | 0 | 0 | Central meeting / transition |

The Commons is the containing environment, not a ninth station. Crossroads remains the spatial centre. The map's links from the origin to each region are navigational relationships, not claims that every region depends on Crossroads.

## 6. Persistent interface positions

- **Top bar:** current place, local/runtime status, identity and invocation shortcut.
- **Left rail:** stable navigation; global places first, regions second, cross-cutting lenses last.
- **Main column:** one active view at a time. The Commons landing view places the spatial field first, contribution second, open doors third.
- **Right rail:** inspector first, invocation second, identity third, recent artefacts fourth, local-data controls last.
- **Spatial map:** region positions remain constant across Commons and Observatory views. Camera movement changes viewpoint, never underlying coordinates.
- **Inspector:** selecting an object updates the right rail; it does not replace or relocate the map.
- **Contribution:** source text is stored as supplied. Derived interpretation must be stored separately and retain a reference to its source.

## 7. Ontological commitments

The place recognises at minimum:
- **Entity:** anything with an identity in the represented world.
- **Agent:** an entity capable of initiating or participating in action; human and digital are agent subtypes, not synonyms.
- **Data:** recorded values or observations.
- **Code:** executable or interpretable instructions.
- **Proposition:** a statement that can be asserted, denied, tested or related.
- **Axiom:** a proposition adopted as a starting premise within a specified formal system; its authority is local to that system.
- **Artefact:** a persistent object made, collected or contributed.
- **Relationship:** a typed connection between entities.
- **Claim:** an assertion with a source, status and supporting or opposing evidence.
- **Event:** a change or occurrence with temporal position.
- **Constraint:** a condition limiting possibility or action.
- **Permission / authority:** a scoped and revocable basis for an action.

These are not assumed to be mutually exclusive storage types. Code can be data; an axiom is a proposition; a person is an agent and an entity. The model must permit typed overlap without category collapse.

## 8. Epistemic and governance rules

1. Preserve original source material.
2. Distinguish observation, interpretation, inference, hypothesis, decision and action.
3. Retain unknowns and contradictions.
4. Attach provenance to claims and derived artefacts.
5. Do not treat model output as authority.
6. Permissions are explicit, scoped, time-bounded where appropriate, and revocable.
7. Consequential actions require confirmation and an execution record.
8. A missing observation is not a negative observation.
9. Historical facts are not silently overwritten by newer interpretations.
10. A region is a perspective, not an exclusive ontology class. Objects may be related to several regions.

## 9. Invocation and sovereignty

The front end accepts an OpenAI-compatible chat-completions endpoint. The current prototype calls the configured endpoint directly from the browser.

The interface does not itself create sovereignty. A sovereign deployment additionally requires:
- operator-controlled model weights or provider contracts;
- controlled compute and networking;
- data storage, backup and export under operator authority;
- authentication and role-based permissions;
- a server-side invocation gateway for shared use;
- secret management outside browser storage;
- audit logs, rate limits and revocation;
- a documented fallback when any model provider is unavailable.

No API key should be placed in a public browser deployment for a multi-user production environment.

## 10. Deployment status and remaining production work

The committed browser build provides the product frame, spatial map, fixed region navigation, local artefact storage, local identity registration and direct model endpoint invocation.

It is a strong single-browser prototype, not yet a fully shared service. The following are production gates:
1. Backend persistence and synchronisation across users and devices.
2. Authentication, agent credentials and scoped permissions.
3. Server-side model gateway and secret management.
4. Durable artefact storage, search and version history.
5. Real-time presence and shared conversations.
6. Export, backup, deletion and recovery.
7. Automated tests, accessibility review, mobile performance and security review.
8. Self-hosted static dependencies for deployments requiring offline or supply-chain control.

The product should not be described as multi-user, fully sovereign or production-secure until those gates are implemented and verified.

## 11. Acceptance test

A first-time visitor can enter without a task, understand the regions, inspect the map, leave an artefact, return to find it, register a declared identity and invoke a model endpoint they control. The visitor can distinguish what is local from what is shared, and can tell observation from inference and permission from capability.
