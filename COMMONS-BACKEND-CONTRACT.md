# The Commons · backend contract

**Version:** 0.1  
**Purpose:** move the current local-first interface to a genuinely shared, multi-user environment without changing the product's spatial or ontological commitments.

This is an implementation contract, not a claim that a backend has already been deployed.

## 1. Deployment shape

Recommended first production topology:

- Static web client: the existing Observatory GitHub Pages surface or an equivalent static host.
- API: a small server-side service (FastAPI or equivalent).
- Database: PostgreSQL.
- Object storage: S3-compatible storage for larger artefacts and attachments.
- Identity: OIDC-compatible authentication, with separate participant identities and agent credentials.
- Invocation gateway: server-side model adapter. Provider secrets never enter the browser.
- Realtime: server-sent events first; WebSocket presence can follow when needed.

The client should remain a thin interface. It must not be trusted to enforce permissions.

## 2. Core records

All records are scoped to a space. The first deployment can have one public Commons space and private rooms, but the schema should not assume one global tenant.

### spaces
- id (UUID, primary key)
- slug (unique)
- name
- description
- visibility (public, private, unlisted)
- created_at, updated_at

### participants
- id (UUID, primary key)
- kind (human, agent, organisation, service)
- display_name
- description
- external_subject (nullable identity-provider subject)
- status (active, suspended, retired)
- created_at, updated_at

### memberships
- id, space_id, participant_id
- role (owner, steward, member, guest, agent)
- status (invited, active, suspended, departed)
- joined_at, left_at
- unique(space_id, participant_id)

### objects
The universal record for things that exist in the Commons representation. Objects are not restricted to one exclusive category.
- id, space_id, created_by
- canonical_type (entity, artefact, proposition, axiom, dataset, code, event, place, other)
- title
- description
- payload (JSONB)
- lifecycle_state (proposed, active, dormant, superseded, archived, withdrawn)
- source_object_id (nullable lineage link)
- created_at, updated_at

### object_types
Many-to-many classification. An object may be code and data, or an axiom and proposition, without category collapse.
- object_id
- type_name
- confidence (nullable)
- assigned_by
- created_at
- primary key(object_id, type_name)

### relationships
- id, space_id
- subject_object_id
- predicate
- object_object_id
- directionality
- status (asserted, observed, inferred, disputed, withdrawn)
- confidence (nullable)
- provenance_object_id (nullable)
- created_by
- created_at, updated_at

### claims
- id, space_id, subject_object_id
- statement
- claim_status (asserted, supported, disputed, rejected, unresolved)
- confidence (nullable)
- source_object_id
- created_by
- created_at, updated_at

### evidence
- id, space_id, claim_id
- evidence_object_id
- relation (supports, opposes, qualifies, contextualises)
- method
- observed_at
- recorded_at
- created_by

### regions
Use the stable region identifiers: observatory, garden, forge, harbour, crossroads, resolve, archive, compost.
- id, space_id, region_key
- object_id
- placement_state (suggested, confirmed, removed)
- placed_by
- placed_at
- unique(space_id, region_key, object_id)

Region membership is a perspective or placement, not an exclusive object type. The same object can be visible from several regions.

### artefacts
- id, space_id, object_id
- artefact_kind (note, question, proposition, code, data, axiom, reference, document, image, other)
- body_text (nullable)
- storage_uri (nullable)
- media_type (nullable)
- version_number
- created_by
- created_at

### threads and messages
- threads: id, space_id, title, status, created_by, created_at, updated_at
- messages: id, thread_id, author_participant_id, author_kind, body, reply_to_id, created_at
- message_references: message_id, object_id, relation (mentions, cites, derives_from, challenges)

### permissions
- id, space_id, subject_participant_id
- resource_type, resource_id (nullable)
- action
- scope (JSONB)
- valid_from, valid_until
- granted_by, revoked_at, revoked_by
- created_at

### invocations
- id, space_id, participant_id, model_endpoint_id
- model_identifier
- request_object_id, response_object_id
- status
- token_usage (JSONB)
- started_at, completed_at
- error_summary (nullable)

### model_endpoints
- id, space_id
- label, provider_kind, base_url
- secret_reference (server-side secret manager key; never raw secret)
- model_allowlist (JSONB)
- enabled, created_by, created_at, updated_at

### events
Append-only record of meaningful state changes:
- id, space_id, actor_participant_id
- event_type
- subject_type, subject_id
- payload (JSONB)
- occurred_at, recorded_at
- correlation_id

## 3. API surface

All endpoints are versioned under `/api/v1`. All writes require an authenticated participant and a valid space membership unless explicitly public.

### Discovery and spaces
- `GET /spaces`
- `GET /spaces/{space_id}`
- `GET /spaces/{space_id}/field` — spatial regions, objects and relationships
- `GET /spaces/{space_id}/search?q=` — search across visible objects and artefacts

### Objects and relationships
- `POST /spaces/{space_id}/objects`
- `GET /objects/{object_id}`
- `PATCH /objects/{object_id}`
- `POST /objects/{object_id}/relationships`
- `GET /objects/{object_id}/neighbourhood`
- `POST /objects/{object_id}/claims`
- `POST /claims/{claim_id}/evidence`

### Regions and discovery
- `GET /spaces/{space_id}/regions`
- `PUT /spaces/{space_id}/regions/{region_key}/objects/{object_id}`
- `DELETE /spaces/{space_id}/regions/{region_key}/objects/{object_id}`
- `GET /spaces/{space_id}/regions/{region_key}/feed`

### Participation
- `GET /spaces/{space_id}/participants`
- `POST /spaces/{space_id}/memberships`
- `GET /spaces/{space_id}/threads`
- `POST /spaces/{space_id}/threads`
- `GET /threads/{thread_id}/messages`
- `POST /threads/{thread_id}/messages`

### Invocation
- `GET /spaces/{space_id}/model-endpoints`
- `POST /spaces/{space_id}/invocations`
- `GET /invocations/{invocation_id}`

### Portability
- `GET /spaces/{space_id}/export`
- `POST /spaces/{space_id}/import`
- `DELETE /objects/{object_id}` — soft withdrawal first; retention and erasure policy must be explicit.

## 4. Required invariants

1. **Space isolation:** every query is scoped by space and membership.
2. **No browser secrets:** provider credentials exist only in server-side secret storage.
3. **Explicit identity:** human, agent, organisation and service identities are distinguishable.
4. **Scoped authority:** permission checks occur server-side on every protected operation.
5. **Provenance:** derived claims and artefacts retain source references.
6. **Contradiction:** conflicting claims can coexist; no silent overwrite.
7. **Temporal record:** created, observed, updated and superseded times are distinct.
8. **Reversibility:** destructive operations are soft by default and auditable.
9. **Exportability:** a space owner can export objects, relationships, artefacts and event history in documented formats.
10. **Provider independence:** the platform can change model endpoint without migrating the Commons data model.
11. **Agent accountability:** each agent action is attributable to an agent identity and the authority under which it acted.
12. **Human override:** an agent cannot grant itself authority or expand its own permissions.

## 5. First production milestone

A credible first shared release requires:
- sign-in and participant identity;
- one public Commons space plus private test space;
- PostgreSQL persistence for objects, artefacts, regions, memberships and messages;
- server-side endpoint secrets and invocation proxy;
- read/write permissions with audit events;
- search and export;
- deploy and backup runbooks.

Presence indicators, collaborative cursors, richer agent protocols and advanced graph queries can follow. Do not delay the first shared release for decorative realtime features.

## 6. Migration from the current prototype

The current browser store is a local draft, not the canonical database. Migration should:
1. Export the local JSON state.
2. Create or select the destination space.
3. Resolve the local profile to a participant identity.
4. Import artefacts and messages with original timestamps where available.
5. Preserve local IDs as external references in migration metadata.
6. Verify counts and content hashes before marking import complete.
7. Keep the original local export until the owner confirms the shared copy.

No data should be silently uploaded during sign-in.
