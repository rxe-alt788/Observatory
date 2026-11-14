# Commons Ingestion Service · v0.1

**Purpose:** give people one low-friction way to contribute raw material to the Commons while establishing the contract for how that material becomes searchable, connected and usable.

This first release uses GitHub Issues as the intake surface. It is an intake protocol and human-operated workflow, **not yet an automated ingestion API or shared knowledge database**. Issue submissions are public in this repository unless GitHub access settings say otherwise. Never submit confidential, personal, commercially sensitive or otherwise restricted material here.

## 1. The user experience

A contributor opens **New issue → Commons intake** and can submit pasted thoughts, notes, conversations or excerpts; public URLs; descriptions of emails or documents with safe excerpts; questions and problems; or appropriate public attachments.

They should not need to classify everything or understand the Commons ontology before contributing. The form asks only for enough context to make the material interpretable.

## 2. Intake contract

| Field | Why it exists |
|---|---|
| Intake ID | Stable GitHub issue number and URL |
| Contributor | GitHub identity, where available |
| Material type | Initial hint, not a permanent classification |
| Raw material / source links | Original submitted content or source reference |
| Context | Why it matters, if known |
| Requested treatment | Capture, organise, connect, compare, summarise or investigate |
| Access / sensitivity | Public suitability and restrictions |
| Received timestamp | When it entered the Commons |
| Processing state | Received, queued, processing, review required, indexed, rejected or failed |

GitHub's issue record is the source record for this prototype. Later ingestion must preserve its issue URL and number as provenance.

## 3. Processing pipeline

1. **Receive** — accept the issue body and permitted attachments.
2. **Register** — create an immutable intake record with issue URL, contributor, timestamp and content hash.
3. **Preserve** — retain the original submission and source references. Do not overwrite source material with a summary.
4. **Extract** — parse text, metadata, entities, dates, claims, questions and named sources.
5. **Enrich** — propose tags, descriptions, candidate relationships and possible duplicates.
6. **Index** — make approved material available to keyword and semantic search.
7. **Review** — flag uncertain classifications, sensitive content, access questions and inferred relationships for human review.
8. **Expose** — allow the material to be searched, inspected, compared and cited back to its source.

AI-generated descriptions, classifications and relationships are derived records. They must retain links to the original intake and be marked as machine-generated or inferred. They must never silently replace source content.

## 4. Data model

The existing backend contract supplies the starting vocabulary: objects, object_types, relationships, claims, evidence, artefacts, events, permissions and invocations.

Add an ingestion record (or equivalent object metadata) with: id, space_id, source_system (initially github_issue), source_id (issue number), source_uri (canonical issue URL), submitted_by, received_at, raw_payload_uri or preserved raw body, content_hash, media_type, processing_status, processing_version, visibility and error_summary.

Derived objects must reference the intake record through explicit provenance relationships. Keep the original source and derived interpretations distinct.

## 5. First implementation boundary

**Included now:** a GitHub Issue Form for low-friction public submissions; this documented intake and processing contract; a stable path from each submission back to its original issue.

**Not implemented yet:** a running API endpoint or webhook receiver; automatic issue-to-database ingestion; file parsing / OCR / audio transcription workers; PostgreSQL, object storage, vector search or graph query deployment; automatic AI classification or relationship extraction; authentication, private intake spaces or access-control enforcement beyond GitHub repository permissions.

Do not describe the service as automated until those components are deployed and tested.

## 6. Acceptance tests for the next build

1. A first-time contributor can submit an unstructured thought without knowing where it belongs.
2. A contributor can submit several source links and explain the question connecting them.
3. The intake record retains the exact original issue reference and submitted content.
4. The processor can produce a structured record without changing the original.
5. Every extracted claim and proposed relationship links to its source.
6. Uncertain or conflicting interpretations remain visible and are not silently resolved.
7. Search can retrieve the material by words, entities and meaning.
8. A person can inspect, correct and export the record.
9. Restricted material is not accepted into a public issue workflow.

## 7. Next technical step

Implement a small server-side receiver for GitHub issue webhooks. Verify webhook signatures, accept only the intended repository and issue form, fetch the issue through the GitHub API, register an idempotent intake record, and enqueue processing. Do not call an LLM synchronously inside the webhook request. The worker should process asynchronously and report status back to the issue.

The first end-to-end proof is one issue becoming one preserved intake record, one searchable object and a set of source-linked extracted claims.