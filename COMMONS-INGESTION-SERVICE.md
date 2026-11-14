# Commons Ingestion Service · v0.1

**Purpose:** give people one low-friction way to contribute raw material to the Commons while establishing the contract for how that material becomes searchable, connected and usable.

This release uses GitHub Issues as the intake surface. GitHub Actions preserves source submissions and, when the repository secret `OPENAI_API_KEY` is configured, generates a source-linked AI analysis draft on issue creation. This is an automated first-pass processor, **not yet a searchable shared knowledge database or a deployed ingestion API**. Issue submissions are public in this repository unless GitHub access settings say otherwise. Never submit confidential, personal, commercially sensitive or otherwise restricted material here.

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

**Included now:** a GitHub Issue Form; append-only preservation snapshots; a readable current source record; and a GitHub Actions step that calls the OpenAI Responses API to create a separate, source-linked Markdown analysis draft on intake creation. The AI step requires the repository Actions secret `OPENAI_API_KEY`; the optional repository variable `OPENAI_MODEL` selects the model, defaulting to `gpt-6-astra`. If the secret is absent, preservation still completes and AI analysis is skipped with a workflow warning.

**Not implemented yet:** a running API endpoint or webhook receiver; automatic issue-to-database ingestion; attachment downloading or file parsing / OCR / audio transcription workers; PostgreSQL, object storage, vector search or graph query deployment; cross-intake relationship resolution; authenticated private intake spaces or access-control enforcement beyond GitHub repository permissions; human review and approval UI.

Do not describe the service as automated until those components are deployed and tested.

## 6. Acceptance tests for the next build

1. A first-time contributor can submit an unstructured thought without knowing where it belongs.
2. A contributor can submit several source links and explain the question connecting them.
3. The intake record retains the exact original issue reference and submitted content.
4. The processor can produce a structured record without changing the original.
5. Every extracted claim and proposed relationship links to its source.
6. Uncertain or conflicting interpretations remain visible and are not silently resolved.
7. The generated analysis is visibly marked as machine-generated and links back to the original issue.
8. A person can inspect, correct and export the record.
9. Restricted material is not accepted into a public issue workflow.

## 7. Next technical step

The current GitHub Actions implementation is a first automated processor: the issue event starts the workflow, preservation runs first, and a separate AI step calls the OpenAI Responses API to draft an analysis. It does not execute tools or grant the model repository access. The issue body is treated as untrusted source material, and an existing analysis file is not overwritten.

Next, test this on a fresh intake with the repository Actions secret `OPENAI_API_KEY` configured. Then add an explicit human-review state and structured records for extracted claims, entities, evidence and candidate relationships. A server-side receiver and asynchronous worker become necessary when moving beyond GitHub Actions and repository files.

The first end-to-end proof is one issue becoming one preserved intake record, one searchable object and a set of source-linked extracted claims.

## 8. Preservation implementation

The repository now contains `.github/workflows/preserve-commons-intake.yml`.

When an issue matching the Commons intake form is opened, edited, reopened or closed, GitHub Actions:
- captures the issue title, exact body, issue URL and number, contributor identity, timestamps, state, labels and source links;
- writes an event snapshot to `commons/intakes/issue-N/snapshots/`;
- maintains `commons/intakes/issue-N/current.md` as a readable view of the latest issue state;
- keeps historical snapshots append-only and makes retries of the same event idempotent.

The original GitHub issue remains the canonical source. The Markdown file is a convenience view; JSON snapshots preserve the event payload fields needed for later ingestion. Issue edits create new snapshots rather than overwriting historical ones. Closing an issue also creates a snapshot; it does not delete the preserved contribution.

**Limitations:** preservation has been verified on live intakes #1 and #2. The automated AI step has been committed but has not yet been verified on a fresh issue with an API key configured. The workflow preserves issue text and links, not binary attachment contents. It does not create PostgreSQL records, semantic indexes or a cross-intake relationship graph. The repository and its issues are public, so this workflow is only suitable for public-safe contributions.
