// Observatory Constitutional Engine v1.4
// Static-browser ES module. No framework/build step required.
// v1.1 adds premise-version dependency graphs, recursive invalidation,
// auditable invalidation records, and layer-scoped reevaluation queues.
// v1.2 adds joint upstream uncertainty sampling, policy-conditional robustness,
// and non-monotonic decision-surface region sweeping.
// v1.3 adds Garden action generation, hypothesis-space search provenance,
// coverage-aware Forge judgments, and constitutional search-honesty review.

export const LAYERS = Object.freeze({
  OBSERVATORY: 'OBSERVATORY',
  GARDEN: 'GARDEN',
  CROSSROADS: 'CROSSROADS',
  FORGE: 'FORGE',
  HARBOUR: 'HARBOUR',
  PERCH: 'PERCH'
});

export const JURISDICTION = Object.freeze({
  OBSERVATORY: new Set(['epistemic_claim', 'outcome_record']),
  GARDEN: new Set(['possibility', 'hypothesis_set']),
  CROSSROADS: new Set(['normative_directive']),
  FORGE: new Set(['recommendation']),
  HARBOUR: new Set(['authorization', 'capacity_reservation', 'execution_record', 'reconciliation_record', 'remedial_requirement']),
  PERCH: new Set([])
});

export class JurisdictionalViolationError extends Error {
  constructor(layer, attemptedKind) {
    super(`CONSTITUTIONAL TRESPASS: ${layer} cannot emit ${attemptedKind}`);
    this.name = 'JurisdictionalViolationError';
    this.layer = layer;
    this.attemptedKind = attemptedKind;
  }
}

export class PremiseIntegrityError extends Error {
  constructor(artifactId, problems) {
    super(`PREMISE INTEGRITY FAILURE: ${artifactId} cannot be activated: ${problems.join('; ')}`);
    this.name = 'PremiseIntegrityError';
    this.artifactId = artifactId;
    this.problems = problems;
  }
}

export class ConstitutionalKernel {
  constructor() {
    // One current node per logical artifact/premise id. Previous versions remain in history.
    this.registry = new Map();
    this.history = new Map();
    // parent premise/artifact id -> downstream derived artifact ids
    this.downstreamGraph = new Map();
    this.verdicts = [];
    this.invalidationLog = [];
    this.reevaluationQueue = [];
    this.historicalReviewLog = [];
    this.historicalReviewQueue = [];
  }

  registerPremise(premise) {
    return this.#registerNode(null, premise, true);
  }

  registerArtifact(emitter, artifact) {
    const allowed = JURISDICTION[emitter];
    if (!allowed || !allowed.has(artifact.kind)) {
      const error = new JurisdictionalViolationError(emitter, artifact.kind);
      this.verdicts.push({ ok: false, article: 'I/IV', message: error.message, at: Date.now() });
      throw error;
    }
    return this.#registerNode(emitter, artifact, false);
  }

  registerHistoricalArtifact(emitter, artifact) {
    const allowed = JURISDICTION[emitter];
    if (!allowed || !allowed.has(artifact.kind)) {
      const error = new JurisdictionalViolationError(emitter, artifact.kind);
      this.verdicts.push({ ok: false, article: 'I/IV', message: error.message, at: Date.now() });
      throw error;
    }
    const result = this.#registerNode(emitter, { ...artifact, historicalFact: true }, false);
    const node = this.registry.get(artifact.id);
    node.historicalFact = true;
    node.status = 'executed_under_valid_premises';
    node.sealedAt = node.sealedAt || new Date();
    result.node = structuredCloneSafe(node);
    this.verdicts.push({ ok: true, article: 'VIII/IX', message: `Historical fact sealed: ${artifact.id}@${node.versionHash}`, at: Date.now() });
    return result;
  }

  markJudgmentExecuted(artifactId, executionId, executedAt = new Date()) {
    const node = this.registry.get(artifactId);
    if (!node) return false;
    node.judgmentStatus = 'executed_under_valid_premises';
    node.executedBy = executionId;
    node.executedAt = new Date(executedAt);
    this.#archive({ ...node }, 'executed_under_valid_premises', `Lawfully executed via ${executionId}.`);
    return true;
  }


  sealArtifactAsHistorical(artifactId, reason = 'Historical transition completed.') {
    const node = this.registry.get(artifactId);
    if (!node) return false;
    node.historicalFact = true;
    node.status = 'executed_under_valid_premises';
    node.sealedAt = new Date();
    node.invalidationReason = undefined;
    this.reevaluationQueue = this.reevaluationQueue.filter(q => q.artifactId !== artifactId);
    this.#archive({ ...node }, 'executed_under_valid_premises', reason);
    return true;
  }

  #registerNode(emitter, input, isPremise) {
    const premiseRefs = structuredCloneSafe(input.premiseRefs || input.boundPremises || []);
    const versionHash = input.versionHash || stableHash({ ...input, versionHash: undefined });
    const now = new Date();
    const node = {
      ...structuredCloneSafe(input),
      versionHash,
      premiseRefs,
      emitter,
      isPremise,
      status: 'active',
      activatedAt: now,
      invalidatedAt: undefined,
      invalidationReason: undefined
    };

    if (!isPremise && premiseRefs.length) {
      const problems = this.#premiseProblems(premiseRefs);
      if (problems.length) {
        const error = new PremiseIntegrityError(node.id, problems);
        this.verdicts.push({ ok: false, article: 'II/III', message: error.message, at: Date.now() });
        throw error;
      }
    }

    const previous = this.registry.get(node.id);
    const changed = Boolean(previous && previous.versionHash !== node.versionHash);

    if (previous) {
      this.#removeChildFromPremiseIndexes(previous);
      this.#archive(previous, changed ? 'invalidated' : previous.status, changed
        ? `Superseded by version ${node.versionHash}.`
        : previous.invalidationReason);
    }

    this.registry.set(node.id, node);
    this.#indexChildPremises(node);
    // Re-evaluation has now produced a current version of this artifact.
    this.reevaluationQueue = this.reevaluationQueue.filter(q => q.artifactId !== node.id);

    let invalidationRecords = [];
    if (changed) {
      invalidationRecords = this.#invalidateDirectVersionDependents(
        node.id,
        node.versionHash,
        `Premise '${node.id}' changed from ${previous.versionHash} to ${node.versionHash}.`
      );
    }

    if (!isPremise) {
      this.verdicts.push({ ok: true, article: 'I/IV', message: `${emitter} emitted ${node.kind} ${node.id}@${node.versionHash}`, at: Date.now() });
    }
    return { node: structuredCloneSafe(node), changed, invalidationRecords };
  }

  #premiseProblems(refs) {
    const problems = [];
    for (const ref of refs) {
      const current = this.registry.get(ref.artifactId);
      if (!current) {
        problems.push(`missing premise ${ref.artifactId}`);
      } else if (current.status !== 'active' && !(current.historicalFact && current.status === 'executed_under_valid_premises')) {
        problems.push(`premise ${ref.artifactId} is ${current.status}`);
      } else if (current.versionHash !== ref.versionHash) {
        problems.push(`premise ${ref.artifactId} expected ${ref.versionHash} but active is ${current.versionHash}`);
      }
    }
    return problems;
  }

  #indexChildPremises(node) {
    for (const ref of node.premiseRefs || []) {
      if (!this.downstreamGraph.has(ref.artifactId)) this.downstreamGraph.set(ref.artifactId, new Set());
      this.downstreamGraph.get(ref.artifactId).add(node.id);
    }
  }

  #removeChildFromPremiseIndexes(node) {
    for (const ref of node.premiseRefs || []) {
      const set = this.downstreamGraph.get(ref.artifactId);
      if (!set) continue;
      set.delete(node.id);
      if (!set.size) this.downstreamGraph.delete(ref.artifactId);
    }
  }

  #archive(node, status = node.status, reason = node.invalidationReason) {
    const archived = structuredCloneSafe({ ...node, status, invalidationReason: reason });
    if (!this.history.has(node.id)) this.history.set(node.id, []);
    this.history.get(node.id).push(archived);
  }

  #invalidateDirectVersionDependents(mutatedPremiseId, newVersionHash, reason) {
    const records = [];
    const directDependents = [...(this.downstreamGraph.get(mutatedPremiseId) || [])];
    for (const dependentId of directDependents) {
      const dependent = this.registry.get(dependentId);
      if (!dependent || dependent.status !== 'active') continue;
      const ref = (dependent.premiseRefs || []).find(r => r.artifactId === mutatedPremiseId);
      if (ref && ref.versionHash !== newVersionHash) {
        records.push(...this.#invalidateCascade(dependentId, mutatedPremiseId, reason, mutatedPremiseId));
      }
    }
    return records;
  }

  #invalidateCascade(targetArtifactId, immediateCauseId, reason, rootMutationId, visited = new Set()) {
    if (visited.has(targetArtifactId)) return [];
    visited.add(targetArtifactId);
    const target = this.registry.get(targetArtifactId);
    if (!target) return [];
    if (target.historicalFact && target.status === 'executed_under_valid_premises') {
      // Historical bridge artifacts (for example a consumed reservation) remain
      // lawful facts but still transmit lineage review to their historical child.
      if (target.kind === 'execution_record') {
        const review = {
          executionArtifactId: targetArtifactId,
          executionVersionHash: target.versionHash,
          immediateCauseId,
          rootMutationId,
          reviewedAt: new Date(),
          reason,
          verdict: 'HISTORICAL_FACT_PRESERVED_REVIEW_REQUIRED'
        };
        this.historicalReviewLog.push(review);
        if (!this.historicalReviewQueue.some(x => x.executionArtifactId === targetArtifactId)) {
          this.historicalReviewQueue.push(structuredCloneSafe(review));
        }
        this.verdicts.push({ ok: true, article: 'IX', message: `${targetArtifactId} preserved as history; premise drift triggers review, not erasure.`, at: Date.now() });
        return [];
      }
      const records=[];
      for (const childId of [...(this.downstreamGraph.get(targetArtifactId) || [])]) {
        const childReason = `Historical upstream artifact '${targetArtifactId}' remains preserved, but its supporting premise drifted because ${reason}`;
        records.push(...this.#invalidateCascade(childId, targetArtifactId, childReason, rootMutationId, visited));
      }
      return records;
    }
    if (target.status !== 'active') return [];

    target.status = 'invalidated';
    target.invalidatedAt = new Date();
    target.invalidationReason = reason;

    const record = {
      targetArtifactId,
      targetVersionHash: target.versionHash,
      invalidatedByPremiseId: immediateCauseId,
      rootMutationId,
      invalidatedAt: target.invalidatedAt,
      reason
    };
    this.invalidationLog.push(record);

    if (target.emitter && target.emitter !== LAYERS.PERCH) {
      this.#queueReevaluation(targetArtifactId, target.emitter, reason);
    }

    const records = [structuredCloneSafe(record)];
    for (const childId of [...(this.downstreamGraph.get(targetArtifactId) || [])]) {
      const childReason = `Upstream artifact '${targetArtifactId}' was invalidated because ${reason}`;
      records.push(...this.#invalidateCascade(childId, targetArtifactId, childReason, rootMutationId, visited));
    }
    return records;
  }

  #queueReevaluation(artifactId, layer, reason) {
    const existing = this.reevaluationQueue.find(q => q.artifactId === artifactId);
    if (existing) {
      existing.reason = reason;
      existing.requestedAt = new Date();
      return;
    }
    this.reevaluationQueue.push({ artifactId, layer, reason, requestedAt: new Date() });
  }

  verifyRecommendationValidity(rec) {
    const refs = rec.premiseRefs || rec.boundPremises || [];
    const problems = this.#premiseProblems(refs);
    const valid = problems.length === 0;
    this.verdicts.push({
      ok: valid,
      article: 'III',
      message: valid ? `Recommendation ${rec.id} premises current` : `Recommendation ${rec.id} invalid: ${problems.join('; ')}`,
      at: Date.now()
    });
    return { valid, invalidatedPremises: problems };
  }

  getArtifactStatus(id) {
    return this.registry.get(id)?.status ?? 'not_found';
  }

  getNode(id) {
    const node = this.registry.get(id);
    return node ? structuredCloneSafe(node) : null;
  }

  getHistory(id) {
    return structuredCloneSafe(this.history.get(id) || []);
  }

  getInvalidationLog() {
    return structuredCloneSafe(this.invalidationLog);
  }

  getReevaluationQueue() {
    return structuredCloneSafe(this.reevaluationQueue);
  }


  getHistoricalReviewLog() {
    return structuredCloneSafe(this.historicalReviewLog);
  }

  getHistoricalReviewQueue() {
    return structuredCloneSafe(this.historicalReviewQueue);
  }

  clearHistoricalReview(executionArtifactId) {
    this.historicalReviewQueue = this.historicalReviewQueue.filter(x => x.executionArtifactId !== executionArtifactId);
  }

  getInvalidatedNodes() {
    return [...this.registry.values()].filter(n => n.status === 'invalidated').map(structuredCloneSafe);
  }

  verifyPremiseRefs(refs) {
    const problems = this.#premiseProblems(refs || []);
    return { valid: problems.length === 0, problems };
  }

  verifyArtifactTree(id) {
    const problems = [];
    const visited = new Set();
    const walk = artifactId => {
      if (visited.has(artifactId)) return;
      visited.add(artifactId);
      const node = this.registry.get(artifactId);
      if (!node) { problems.push(`missing artifact ${artifactId}`); return; }
      if (node.status !== 'active' && !(node.historicalFact && node.status === 'executed_under_valid_premises')) { problems.push(`${artifactId} is ${node.status}`); return; }
      for (const ref of node.premiseRefs || []) {
        const premise = this.registry.get(ref.artifactId);
        if (!premise) { problems.push(`missing premise ${ref.artifactId}`); continue; }
        if (premise.status !== 'active' && !(premise.historicalFact && premise.status === 'executed_under_valid_premises')) { problems.push(`premise ${ref.artifactId} is ${premise.status}`); continue; }
        if (premise.versionHash !== ref.versionHash) {
          problems.push(`premise ${ref.artifactId} expected ${ref.versionHash} but active is ${premise.versionHash}`);
          continue;
        }
        if (!premise.isPremise) walk(ref.artifactId);
      }
    };
    walk(id);
    return { valid: problems.length === 0, problems };
  }

  reviewCanonicalEntity(entity) {
    const forbidden = ['space', 'station', 'stage', 'lane', 'column'];
    const leaks = forbidden.filter(k => Object.prototype.hasOwnProperty.call(entity, k));
    const validType = ['concept','project','document','person','commitment','question'].includes(entity.type);
    return {
      ok: leaks.length === 0 && validType,
      entityId: entity.id,
      leaks,
      messages: [
        ...(leaks.length ? [`Spatial/status leakage: ${leaks.join(', ')}`] : ['No spatial location metadata on canonical entity.']),
        ...(validType ? [] : [`Unknown intrinsic type: ${entity.type}`])
      ]
    };
  }

  reviewSystem(entities, artifacts = []) {
    const entityReviews = entities.map(e => this.reviewCanonicalEntity(e));
    const artifactReviews = artifacts.map(({ emitter, artifact }) => {
      const allowed = JURISDICTION[emitter]?.has(artifact.kind) ?? false;
      return { ok: allowed, emitter, kind: artifact.kind };
    });
    const searchHonestyReviews = artifacts
      .filter(({ artifact }) => artifact.kind === 'recommendation')
      .map(({ artifact }) => {
        const coverage = artifact.coverageAssessment;
        if (!coverage || artifact.judgment?.type !== 'act') return { ok: true, artifactId: artifact.id };
        const limited = coverage.isProvisionalDueToCoverage === true;
        const flagPresent = artifact.searchLimitationFlag === 'PROVISIONAL_SEARCH_LIMITATION';
        return {
          ok: !limited || flagPresent,
          artifactId: artifact.id,
          message: limited && !flagPresent
            ? 'Search Honesty violation: coverage-limited action recommendation lacks provisional limitation flag.'
            : 'Search coverage is lawfully disclosed.'
        };
      });
    const agencyReviews = artifacts
      .filter(({ artifact }) => ['execution_record','authorization'].includes(artifact.kind))
      .map(({ artifact }) => {
        if (artifact.kind === 'execution_record') {
          const ok = artifact.historicalFact === true && artifact.authorizationId && artifact.recommendationId && artifact.reservationId;
          return { ok, artifactId: artifact.id, message: ok ? 'Execution fact is historically sealed and lineage-bound.' : 'Agency Horizon violation: execution record lacks historical seal or lineage.' };
        }
        const ok = artifact.kind !== 'authorization' || artifact.recommendationId;
        return { ok, artifactId: artifact.id, message: ok ? 'Authorization is bound to a recommendation.' : 'Agency Horizon violation: unbound authorization.' };
      });
    const failures = [
      ...entityReviews.filter(r => !r.ok),
      ...artifactReviews.filter(r => !r.ok),
      ...searchHonestyReviews.filter(r => !r.ok),
      ...agencyReviews.filter(r => !r.ok)
    ];
    return {
      ok: failures.length === 0,
      entityReviews,
      artifactReviews,
      searchHonestyReviews,
      agencyReviews,
      failures,
      invalidatedCount: this.getInvalidatedNodes().length,
      pendingReevaluations: this.getReevaluationQueue().length,
      articles: constitutionalArticles()
    };
  }
}

export function constitutionalArticles() {
  return [
    ['I', 'Separation of Powers', 'No layer may silently answer a question belonging to another layer.'],
    ['II', 'Premise Provenance', 'No conclusion may conceal its premises.'],
    ['III', 'Temporal Invalidation', 'No conclusion may survive material premise change without reevaluation.'],
    ['IV', 'Typed Artifact Bounds', 'Possibility is not fact; fact is not value; value is not action; recommendation is not authority.'],
    ['V', 'Right of Abstention', 'The system may abstain, wait, investigate, or return a question upstream.'],
    ['VI', 'Observable Consequences', 'External action must produce an outcome record returned to Observatory.'],
    ['VII', 'Upstream Challenge', 'Any layer may challenge a premise; none may silently rewrite it.'],
    ['VIII', 'Agency Horizon', 'Recommendation is not authorization; authorization is not execution.'],
    ['IX', 'Temporal Justice', 'Lawful execution remains historical fact even when later premises drift.'],
    ['X', 'Capacity Integrity', 'No execution may consume authority or resources already reserved elsewhere.']
  ];
}

export function stableHash(value) {
  const str = JSON.stringify(value, (_k, v) => v instanceof Set ? [...v].sort() : v);
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `v${(h >>> 0).toString(16)}`;
}

export function makeArtifact(kind, id, payload, premiseRefs = payload?.premiseRefs || payload?.boundPremises || []) {
  const cleanPayload = { ...payload };
  delete cleanPayload.boundPremises;
  delete cleanPayload.premiseRefs;
  const refs = structuredCloneSafe(premiseRefs || []);
  const versionHash = stableHash({ kind, id, payload: cleanPayload, premiseRefs: refs });
  return { id, kind, versionHash, ...cleanPayload, premiseRefs: refs };
}

export function makePremise(id, premiseType, payload, versionHash = stableHash(payload)) {
  return { id, kind: 'premise', premiseType, versionHash, payload, premiseRefs: [] };
}

function clamp01(n) { return Math.max(0, Math.min(1, Number(n) || 0)); }
function estimateValue(e, fallback = 0) { return typeof e === 'number' ? e : (e?.value ?? fallback); }

export function buildReverseDependencyIndex(entities) {
  const index = new Map();
  for (const entity of entities) {
    for (const rel of entity.relationships || []) {
      if (!['requires', 'blocks'].includes(rel.relation)) continue;
      if (!index.has(rel.targetId)) index.set(rel.targetId, []);
      index.get(rel.targetId).push({ sourceId: entity.id, relation: rel.relation });
    }
  }
  return index;
}

export function computeReach(entityId, entityMap, reverseIndex, allowedScope = null, lambda = 0.55) {
  const allowed = allowedScope ? new Set(allowedScope) : null;
  const visited = new Set([entityId]);
  const queue = [{ id: entityId, distance: 0 }];
  let weightedReach = 0;
  const affected = [];

  while (queue.length) {
    const current = queue.shift();
    for (const dep of reverseIndex.get(current.id) || []) {
      if (visited.has(dep.sourceId)) continue;
      visited.add(dep.sourceId);
      const distance = current.distance + 1;
      const dependent = entityMap.get(dep.sourceId);
      if (!dependent) continue;
      if (!allowed || allowed.has(dep.sourceId)) {
        const importance = Math.max(0.1, ...(dependent.outputs || []).map(o => estimateValue(o.importance, 1)));
        const contribution = importance * Math.pow(lambda, distance);
        weightedReach += contribution;
        affected.push({ id: dep.sourceId, distance, contribution });
      }
      queue.push({ id: dep.sourceId, distance });
    }
  }
  return { weightedReach, affected };
}

export function evaluateObservatory(entity, context) {
  const incoming = context.entities.flatMap(e => (e.relationships || [])
    .filter(r => r.targetId === entity.id)
    .map(r => ({ sourceId: e.id, relation: r.relation })));
  const outgoing = entity.relationships || [];
  const evidence = entity.evidence || [];
  const uncertainties = evidence.filter(e => (e.confidence ?? 1) < 0.75);
  const leverage = incoming.filter(r => ['requires','blocks'].includes(r.relation)).length + outgoing.length;
  const premiseRefs = [
    context.premiseRef(`entity:${entity.id}`),
    context.premiseRef('graph:canonical')
  ];
  return {
    lens: 'observatory',
    entityId: entity.id,
    title: entity.title,
    question: 'What appears true, and what might be wrong?',
    topology: { incoming, outgoing, degree: incoming.length + outgoing.length },
    uncertainties,
    significance: Math.min(1, leverage / 6),
    artifact: makeArtifact('epistemic_claim', `obs:${entity.id}`, {
      proposition: `${entity.title} has ${incoming.length} incoming and ${outgoing.length} outgoing modeled relationships.`,
      confidence: uncertainties.length ? 0.68 : 0.86,
      evidenceIds: evidence.map(e => e.id),
      observedAt: context.snapshot.timestamp
    }, premiseRefs)
  };
}


// ============================================================================
// v1.4 · GARDEN ACTION GENERATOR & SEARCH BOUNDARY PROVENANCE
// Garden searches four distinct action mechanisms. Coverage is deliberately
// bounded: searching every modeled locus is not the same as exhausting human
// possibility. Open-ended mechanisms therefore have lower epistemic ceilings.
// ============================================================================

export const ACTION_MECHANISMS = Object.freeze([
  'DIRECT_PROGRESS',
  'CONSTRAINT_RELIEF',
  'INFORMATION_GAIN',
  'OPTION_CREATION'
]);

export const DEFAULT_GARDEN_GENERATOR_CONFIG = Object.freeze({
  id: 'garden-generator-v1',
  coverageThreshold: 0.70,
  highUncertaintyThreshold: 0.34,
  informationGainReturnThreshold: 0.58,
  mechanismCeilings: {
    DIRECT_PROGRESS: 0.88,
    CONSTRAINT_RELIEF: 0.84,
    INFORMATION_GAIN: 0.68,
    OPTION_CREATION: 0.55
  },
  mechanisms: {
    DIRECT_PROGRESS: { enabled: true },
    CONSTRAINT_RELIEF: { enabled: true },
    INFORMATION_GAIN: { enabled: true },
    OPTION_CREATION: { enabled: true }
  }
});

function estimateConfidence(e, fallback = 0.7) {
  return typeof e === 'number' ? 1 : clamp01(e?.confidence ?? fallback);
}

function mechanismTargets(entity, snapshot) {
  const incompleteOutputs = (entity.outputs || []).filter(o => estimateValue(o.currentProgress) < 1);
  const constraints = entity.constraints || [];
  const unresolvedDependencies = (entity.dependencies || []).filter(d => !worldDependencyResolved(d.id, snapshot));
  const uncertainEvidence = (entity.evidence || []).filter(e => (e.confidence ?? 1) < 0.8);
  const lowConfidenceEstimates = [];
  for (const o of entity.outputs || []) {
    for (const [field, estimate] of [['currentProgress',o.currentProgress],['importance',o.importance],['consequenceOfInaction',o.consequenceOfInaction]]) {
      if (estimateConfidence(estimate) < 0.72) lowConfidenceEstimates.push({ id:`${o.id}:${field}`, description:`${o.description} · ${field}` });
    }
  }
  for (const c of constraints) {
    if (estimateConfidence(c.consequenceOfInaction) < 0.72) lowConfidenceEstimates.push({ id:`${c.id}:consequenceOfInaction`, description:`${c.description} · consequence of inaction` });
  }
  return {
    DIRECT_PROGRESS: incompleteOutputs.map(o => ({ id:o.id, description:o.description, kind:'output' })),
    CONSTRAINT_RELIEF: constraints.map(c => ({ id:c.id, description:c.description, kind:'constraint' })),
    INFORMATION_GAIN: [
      ...unresolvedDependencies.map(d => ({ id:d.id, description:d.conditionDescription, kind:'dependency' })),
      ...uncertainEvidence.map(e => ({ id:e.id, description:e.description, kind:'evidence' })),
      ...lowConfidenceEstimates.map(x => ({ ...x, kind:'estimate' }))
    ],
    OPTION_CREATION: incompleteOutputs.map(o => ({ id:o.id, description:o.description, kind:'output' }))
  };
}

function actionTargetsMechanism(action, mechanism, targetId) {
  if (action.mechanism !== mechanism) return false;
  if (mechanism === 'DIRECT_PROGRESS') return (action.effects || []).some(e => e.targetType === 'output' && e.targetId === targetId);
  if (mechanism === 'CONSTRAINT_RELIEF') return (action.effects || []).some(e => e.targetType === 'constraint' && e.targetId === targetId);
  if (mechanism === 'INFORMATION_GAIN') return (action.effects || []).some(e => e.targetType === 'information' && e.targetId === targetId);
  if (mechanism === 'OPTION_CREATION') return (action.effects || []).some(e => e.targetType === 'option' && e.targetId === targetId);
  return false;
}

function generatedAction(entity, mechanism, target) {
  const E = (value, confidence=0.62, basis='derived', evidenceIds=[]) => ({ value, confidence, basis, evidenceIds });
  const slug = String(target.id).replace(/[^a-zA-Z0-9_-]/g,'-');
  const common = {
    id:`gen-${entity.id}-${mechanism.toLowerCase().replaceAll('_','-')}-${slug}`,
    entityId:entity.id,
    provenance:'system_generated',
    mechanism,
    generator:{ id:'garden-generator-v1', targetId:target.id, targetKind:target.kind },
    authority:'recommend_only',
    authorityGrantId:'grant-low-risk-runtime'
  };
  if (mechanism === 'DIRECT_PROGRESS') return {
    ...common,
    description:`Complete the next bounded increment of “${target.description}”`,
    effects:[{targetType:'output',targetId:target.id,effectMagnitude:E(.18,.62),successProbability:E(.72,.58)}],
    executionBurden:E(1.8,.58)
  };
  if (mechanism === 'CONSTRAINT_RELIEF') return {
    ...common,
    description:`Run one reversible intervention against “${target.description}”`,
    effects:[{targetType:'constraint',targetId:target.id,effectMagnitude:E(.34,.55),successProbability:E(.58,.52)}],
    executionBurden:E(1.4,.58)
  };
  if (mechanism === 'INFORMATION_GAIN') return {
    ...common,
    description:`Verify the uncertain premise: “${target.description}”`,
    effects:[{targetType:'information',targetId:target.id,effectMagnitude:E(.62,.60),successProbability:E(.78,.62)}],
    executionBurden:E(.65,.64)
  };
  return {
    ...common,
    description:`Create a reversible pilot for “${target.description}”`,
    effects:[
      {targetType:'option',targetId:target.id,effectMagnitude:E(.68,.52),successProbability:E(.66,.50)},
      {targetType:'output',targetId:target.id,effectMagnitude:E(.08,.48),successProbability:E(.60,.48)}
    ],
    executionBurden:E(1.6,.54)
  };
}

function boundaryUnexploredDomains(mechanism) {
  const map = {
    DIRECT_PROGRESS:['Alternative execution methods outside the bounded-output template.'],
    CONSTRAINT_RELIEF:['Indirect or multi-party interventions not represented in the current causal model.'],
    INFORMATION_GAIN:['Unknown unknowns and questions not implied by existing evidence or dependencies.'],
    OPTION_CREATION:['Novel options outside currently modeled outputs; this mechanism is structurally open-ended.']
  };
  return map[mechanism] || [];
}

export function generateHypothesisSet(entity, context) {
  const config = context.generatorConfig || DEFAULT_GARDEN_GENERATOR_CONFIG;
  const seedActions = (context.seedHypotheses || []).filter(a => a.entityId === entity.id).map(structuredCloneSafe);
  const targets = mechanismTargets(entity, context.snapshot);
  const candidateActions = [...seedActions];
  const boundaries = [];

  for (const mechanism of ACTION_MECHANISMS) {
    const enabled = config.mechanisms?.[mechanism]?.enabled !== false;
    const loci = targets[mechanism] || [];
    if (enabled) {
      for (const target of loci) {
        if (!candidateActions.some(a => actionTargetsMechanism(a, mechanism, target.id))) {
          candidateActions.push(generatedAction(entity, mechanism, target));
        }
      }
    }
    const mechanismActions = candidateActions.filter(a => a.mechanism === mechanism);
    const coveredTargets = new Set();
    for (const target of loci) {
      if (mechanismActions.some(a => actionTargetsMechanism(a, mechanism, target.id))) coveredTargets.add(target.id);
    }
    const targetCoverage = loci.length ? coveredTargets.size / loci.length : 1;
    const ceiling = clamp01(config.mechanismCeilings?.[mechanism] ?? 0.65);
    const exhaustionScore = enabled ? ceiling * (0.55 + 0.45 * targetCoverage) : 0;
    boundaries.push({
      mechanism,
      searched: enabled,
      exhaustionScore: round4(exhaustionScore),
      targetCount: loci.length,
      candidateCount: mechanismActions.length,
      unexploredDomains: enabled ? boundaryUnexploredDomains(mechanism) : [`${mechanism} search disabled by generator configuration.`]
    });
  }

  const overallCoverage = round4(boundaries.reduce((s,b)=>s+b.exhaustionScore,0) / ACTION_MECHANISMS.length);
  const unexploredMechanisms = boundaries.filter(b => !b.searched).map(b => b.mechanism);
  const coverageThreshold = Number(config.coverageThreshold ?? 0.70);
  const isProvisionalDueToCoverage = overallCoverage < coverageThreshold || unexploredMechanisms.length > 0;
  const premiseRefs = [
    { artifactId:`entity:${entity.id}`, versionHash:stableHash(entity) },
    { artifactId:`hypothesis-seeds:${entity.id}`, versionHash:stableHash(seedActions) },
    { artifactId:'garden-generator:config', versionHash:stableHash(config) },
    { artifactId:'world:current', versionHash:stableHash(context.snapshot) }
  ];
  const artifact = makeArtifact('hypothesis_set', `hypotheses:${entity.id}`, {
    entityId:entity.id,
    candidateActions,
    boundaries,
    overallCoverage,
    coverageThreshold,
    unexploredMechanisms,
    isProvisionalDueToCoverage,
    coverageCaveat:'Coverage is a bounded search assessment over modeled mechanisms and loci, not a probability that all possible actions have been imagined.'
  }, premiseRefs);
  return { entityId:entity.id, candidateActions, boundaries, overallCoverage, coverageThreshold, unexploredMechanisms, isProvisionalDueToCoverage, artifact };
}

function entityUncertainty(entity) {
  const confidences=[];
  for (const e of entity.evidence || []) confidences.push(clamp01(e.confidence ?? .7));
  for (const o of entity.outputs || []) {
    confidences.push(estimateConfidence(o.currentProgress),estimateConfidence(o.importance),estimateConfidence(o.consequenceOfInaction));
  }
  for (const c of entity.constraints || []) confidences.push(estimateConfidence(c.consequenceOfInaction));
  const avg = confidences.length ? confidences.reduce((s,x)=>s+x,0)/confidences.length : .7;
  return clamp01(1-avg);
}

export function coverageAssessmentFor(entity, context) {
  const set = context.hypothesisSets?.get(entity.id) || generateHypothesisSet(entity, context);
  const info = set.boundaries.find(b=>b.mechanism==='INFORMATION_GAIN');
  const uncertainty = entityUncertainty(entity);
  const config = context.generatorConfig || DEFAULT_GARDEN_GENERATOR_CONFIG;
  return {
    overallCoverage:set.overallCoverage,
    coverageThreshold:set.coverageThreshold,
    unexploredMechanisms:set.unexploredMechanisms,
    isProvisionalDueToCoverage:set.isProvisionalDueToCoverage,
    informationGainCoverage:info?.exhaustionScore ?? 0,
    modelUncertainty:round4(uncertainty),
    shouldReturnToGarden: uncertainty >= Number(config.highUncertaintyThreshold ?? .34)
      && (info?.exhaustionScore ?? 0) < Number(config.informationGainReturnThreshold ?? .58),
    boundaries:set.boundaries
  };
}

export function evaluateGarden(entity, context) {
  const incomplete = (entity.outputs || []).filter(o => estimateValue(o.currentProgress) < 1);
  const unresolved = (entity.dependencies || []).filter(d => !worldDependencyResolved(d.id, context.snapshot));
  const possibilities = incomplete.map(o => ({
    outputId: o.id,
    description: o.description,
    maturity: clamp01(estimateValue(o.currentProgress)),
    importance: estimateValue(o.importance, 1),
    unmetDependencies: unresolved.map(d => d.conditionDescription)
  }));
  const hypothesisSet = context.hypothesisSets?.get(entity.id) || generateHypothesisSet(entity, context);
  return {
    lens: 'garden',
    entityId: entity.id,
    title: entity.title,
    question: 'What could emerge, under what conditions, and what actions have we not searched?',
    possibilities,
    blockedConditions: unresolved,
    candidateActions:hypothesisSet.candidateActions,
    searchBoundaries:hypothesisSet.boundaries,
    overallCoverage:hypothesisSet.overallCoverage,
    unexploredMechanisms:hypothesisSet.unexploredMechanisms,
    isProvisionalDueToCoverage:hypothesisSet.isProvisionalDueToCoverage,
    artifact:hypothesisSet.artifact
  };
}

function worldDependencyResolved(depId, snapshot) {
  const fact = snapshot.dependencies?.[depId];
  if (typeof fact === 'boolean') return fact;
  return Boolean(fact?.value);
}

export function checkExecutability(action, snapshot) {
  const reasons = [];
  let confidence = 1;
  const p = action.preconditions || {};
  if (p.requiredTimeOfDay === 'business_hours') {
    const fact = snapshot.isBusinessHours;
    const value = typeof fact === 'boolean' ? fact : fact?.value;
    confidence *= typeof fact === 'boolean' ? 1 : (fact?.confidence ?? 0.7);
    if (!value) reasons.push('Requires business hours.');
  }
  for (const depId of p.requiredDependencyIds || []) {
    const fact = snapshot.dependencies?.[depId];
    const value = typeof fact === 'boolean' ? fact : fact?.value;
    confidence *= typeof fact === 'boolean' ? 1 : (fact?.confidence ?? 0.7);
    if (!value) reasons.push(`Dependency unresolved: ${depId}`);
  }
  for (const resource of p.requiredResources || []) {
    const fact = snapshot.resources?.[resource];
    const value = typeof fact === 'boolean' ? fact : fact?.value;
    confidence *= typeof fact === 'boolean' ? 1 : (fact?.confidence ?? 0.7);
    if (!value) reasons.push(`Resource unavailable: ${resource}`);
  }
  return { executable: reasons.length === 0, confidence: clamp01(confidence), reasons };
}

function rawImpact(action, entity, context) {
  const vector = {
    outputProgress: 0,
    blockageRelief: 0,
    downstreamReach: 0,
    urgencyAddressed: 0,
    informationGain: 0,
    optionValue: 0,
    executionBurden: Math.max(0, estimateValue(action.executionBurden, 0))
  };
  const evidence = [];

  for (const effect of action.effects || []) {
    const magnitude = clamp01(estimateValue(effect.effectMagnitude));
    const probability = clamp01(estimateValue(effect.successProbability));
    const expected = magnitude * probability;
    evidence.push(...(effect.effectMagnitude?.evidenceIds || []), ...(effect.successProbability?.evidenceIds || []));

    if (effect.targetType === 'output') {
      const out = (entity.outputs || []).find(o => o.id === effect.targetId);
      if (!out) continue;
      vector.outputProgress += expected * estimateValue(out.importance, 1);
      vector.urgencyAddressed += expected * estimateValue(out.consequenceOfInaction, 0);
    } else if (effect.targetType === 'constraint') {
      const c = (entity.constraints || []).find(x => x.id === effect.targetId);
      if (!c) continue;
      const reach = computeReach(entity.id, context.entityMap, context.reverseIndex, c.allowedAffectedEntityIds);
      vector.blockageRelief += expected * (c.severity === 'blocking' ? 1 : 0.5);
      vector.downstreamReach += expected * reach.weightedReach;
      vector.urgencyAddressed += expected * estimateValue(c.consequenceOfInaction, 0);
    } else if (effect.targetType === 'information') {
      vector.informationGain += expected;
    } else if (effect.targetType === 'option') {
      vector.optionValue += expected;
    }
  }
  return { vector, evidence: [...new Set(evidence)] };
}

export const dimensionNormalizers = {
  outputProgress: x => clamp01(x / 10),
  blockageRelief: x => clamp01(x / 2),
  downstreamReach: (x, ctx) => clamp01(x / Math.max(1, ctx.entities.length)),
  urgencyAddressed: x => clamp01(x / 10),
  informationGain: x => clamp01(x),
  optionValue: x => clamp01(x),
  executionBurden: x => clamp01(x / 10)
};

export function normalizeImpact(vector, context) {
  return Object.fromEntries(Object.keys(vector).map(k => [k, dimensionNormalizers[k](vector[k], context)]));
}

export function scoreImpact(normalized, policy) {
  return Object.entries(policy.weights).reduce((sum, [dimension, weight]) => {
    return sum + (normalized[dimension] ?? 0) * weight;
  }, 0);
}

export function evaluateAction(action, entity, context, policy) {
  const feasibility = checkExecutability(action, context.snapshot);
  const raw = rawImpact(action, entity, context);
  const normalized = normalizeImpact(raw.vector, context);
  const score = feasibility.executable ? scoreImpact(normalized, policy) : -Infinity;
  return {
    action,
    feasibility,
    rawImpact: raw.vector,
    normalizedImpact: normalized,
    score,
    evidenceIds: raw.evidence
  };
}

export function detectCrossroads(entity, context) {
  const actions = context.hypotheses.filter(a => a.entityId === entity.id);
  const premiseRefs = [
    context.premiseRef(`entity:${entity.id}`),
    context.premiseRef(`hypotheses:${entity.id}`),
    context.premiseRef('world:current'),
    context.premiseRef('policies:catalog'),
    context.premiseRef('policy:selected')
  ];
  if (!actions.length || !context.policies.length) {
    return {
      lens: 'crossroads', entityId: entity.id, title: entity.title,
      question: 'Where do defensible value policies diverge?',
      divergenceDetected: false, evaluations: [], distinctWinners: [],
      artifact: makeArtifact('normative_directive', `cross:${entity.id}`, {
        policyId: context.activePolicy.id,
        weightMap: context.activePolicy.weights,
        rationale: 'No candidate action set is available for policy divergence testing.',
        authorityId: context.activePolicy.authority.selectedBy,
        divergenceDetected: false
      }, premiseRefs)
    };
  }
  const evaluations = context.policies.map(policy => {
    const ranked = actions.map(a => evaluateAction(a, entity, context, policy))
      .filter(x => Number.isFinite(x.score))
      .sort((a,b) => b.score - a.score);
    return { policyId: policy.id, policyName: policy.name, winnerActionId: ranked[0]?.action.id ?? null, score: ranked[0]?.score ?? null };
  });
  const distinctWinners = [...new Set(evaluations.map(e => e.winnerActionId).filter(Boolean))];
  return {
    lens: 'crossroads',
    entityId: entity.id,
    title: entity.title,
    question: 'Where do defensible value policies diverge?',
    divergenceDetected: distinctWinners.length > 1,
    evaluations,
    distinctWinners,
    artifact: makeArtifact('normative_directive', `cross:${entity.id}`, {
      policyId: context.activePolicy.id,
      weightMap: context.activePolicy.weights,
      rationale: context.activePolicy.rationale,
      authorityId: context.activePolicy.authority.selectedBy,
      divergenceDetected: distinctWinners.length > 1,
      distinctWinners
    }, premiseRefs)
  };
}

export function evaluateForge(entity, context) {
  const hypothesisSet = context.hypothesisSets.get(entity.id);
  const actions = hypothesisSet?.candidateActions || [];
  const coverageAssessment = coverageAssessmentFor(entity, context);
  const crossroads = detectCrossroads(entity, context);
  const baseRefs = forgePremiseRefs(entity, context, crossroads.artifact);
  const allComplete = (entity.outputs || []).length > 0 && entity.outputs.every(o => estimateValue(o.currentProgress) >= 1);
  if (allComplete) return forgeReturn(entity, 'goal_complete', null, [], context, 'All modeled outputs are complete.', baseRefs, coverageAssessment);
  if (!actions.length) return forgeReturn(entity, 'return_to_garden', null, [], context, 'Garden generated no action hypotheses for this entity.', baseRefs, coverageAssessment);

  if (coverageAssessment.shouldReturnToGarden) {
    return forgeReturn(entity, 'return_to_garden', null, [], context,
      `Model uncertainty is high (${coverageAssessment.modelUncertainty}) while information-gain search coverage is only ${coverageAssessment.informationGainCoverage}.`,
      baseRefs, coverageAssessment);
  }

  if (crossroads.divergenceDetected) {
    return forgeReturn(entity, 'return_to_crossroads', null, [], context, 'Accepted policies produce different winning actions.', baseRefs, coverageAssessment);
  }

  const evaluated = actions.map(a => evaluateAction(a, entity, context, context.activePolicy));
  const feasible = evaluated.filter(x => x.feasibility.executable).sort((a,b) => b.score - a.score);
  if (!feasible.length) {
    return forgeReturn(entity, 'temporarily_blocked', null, evaluated, context, evaluated.flatMap(x => x.feasibility.reasons).join(' '), baseRefs, coverageAssessment);
  }
  const winner = feasible[0];
  const statusQuo = Number(context.statusQuoValues?.[entity.id] ?? 0);
  if (winner.score <= statusQuo) {
    return forgeReturn(entity, 'wait', null, evaluated, context, `Status quo (${statusQuo.toFixed(2)}) dominates the best current action (${winner.score.toFixed(2)}).`, baseRefs, coverageAssessment);
  }

  const provisional = coverageAssessment.isProvisionalDueToCoverage;
  const artifact = makeArtifact('recommendation', `forge:${entity.id}`, {
    judgment: { type: 'act', actionPlanId: winner.action.id, expectedValue: round2(winner.score) },
    statusQuoValue: statusQuo,
    coverageAssessment,
    searchLimitationFlag: provisional ? 'PROVISIONAL_SEARCH_LIMITATION' : null
  }, baseRefs);

  return {
    lens: 'forge',
    entityId: entity.id,
    title: entity.title,
    question: 'Given the accepted model and values, what should be attempted next?',
    state: provisional ? 'action_available_provisional' : 'action_available',
    selectedAction: serializeEvaluated(winner),
    alternatives: evaluated.filter(x => x.action.id !== winner.action.id).map(serializeEvaluated),
    statusQuoValue: statusQuo,
    coverageAssessment,
    artifact,
    rationale: buildForgeRationale(winner, feasible[1], context.activePolicy)
  };
}

function forgeReturn(entity, state, selectedAction, alternatives, context, reason, premiseRefs, coverageAssessment = null) {
  const judgment = state === 'wait'
    ? { type: 'wait', condition: reason }
    : state === 'return_to_crossroads'
      ? { type: 'return_to_crossroads', conflict: reason }
      : state === 'return_to_garden'
        ? { type: 'return_to_garden', reason }
        : { type: 'abstain', reason };
  const artifact = makeArtifact('recommendation', `forge:${entity.id}`, {
    judgment,
    statusQuoValue: Number(context.statusQuoValues?.[entity.id] ?? 0),
    coverageAssessment,
    searchLimitationFlag: coverageAssessment?.isProvisionalDueToCoverage ? 'PROVISIONAL_SEARCH_LIMITATION' : null
  }, premiseRefs);
  return {
    lens: 'forge', entityId: entity.id, title: entity.title,
    question: 'Given the accepted model and values, what should be attempted next?',
    state, selectedAction, alternatives: alternatives.map?.(serializeEvaluated) || [], reason, coverageAssessment, artifact
  };
}

function forgePremiseRefs(entity, context, crossroadsArtifact) {
  return [
    context.premiseRef(`entity:${entity.id}`),
    context.premiseRef('graph:canonical'),
    context.premiseRef('world:current'),
    context.premiseRef(`hypotheses:${entity.id}`),
    context.premiseRef('policy:selected'),
    { artifactId: crossroadsArtifact.id, versionHash: crossroadsArtifact.versionHash }
  ];
}

function serializeEvaluated(e) {
  return {
    id: e.action.id,
    description: e.action.description,
    provenance: e.action.provenance,
    mechanism: e.action.mechanism,
    score: Number.isFinite(e.score) ? round2(e.score) : null,
    executable: e.feasibility.executable,
    executabilityConfidence: round2(e.feasibility.confidence),
    blockReasons: e.feasibility.reasons,
    normalizedImpact: mapRound(e.normalizedImpact),
    rawImpact: mapRound(e.rawImpact),
    evidenceIds: e.evidenceIds
  };
}

function buildForgeRationale(winner, runnerUp, policy) {
  return {
    policy: policy.name,
    comparativeFact: runnerUp
      ? `Outranks ${runnerUp.action.description} by ${round2(winner.score - runnerUp.score)} policy points.`
      : 'Sole feasible action hypothesis.',
    strongestDimensions: Object.entries(winner.normalizedImpact)
      .filter(([k]) => k !== 'executionBurden')
      .sort((a,b) => b[1] - a[1]).slice(0,3).map(([k,v]) => `${k}: ${round2(v)}`)
  };
}

export function evaluateHarbour(entity, context) {
  const forge = evaluateForge(entity, context);
  const actionId = forge.selectedAction?.id ?? null;
  const action = context.hypotheses.find(a => a.id === actionId);
  const footprint = actionId ? context.executionFootprints?.[actionId] || defaultExecutionFootprint(action) : null;
  const requiredAuthority = action?.authority || 'recommend_only';
  const permissionFacts = action?.requiredPermissions || [];
  const missingPermissions = permissionFacts.filter(p => !(context.snapshot.permissions?.[p]?.value ?? context.snapshot.permissions?.[p] ?? false));
  const grant = action?.authorityGrantId ? (context.authorityGrants || []).find(g => g.id === action.authorityGrantId) : null;
  const authorityAssessment = actionId ? assessAuthorityGrant({ action, footprint, grant, principalSignoff:false, now:new Date(context.snapshot.timestamp || Date.now()) }) : { authorized:false, reasons:['Forge has not produced an executable action.'], requiresPrincipalSignoff:false, available:null };
  const confirmationAssessment = actionId ? assessAuthorityGrant({ action, footprint, grant, principalSignoff:true, now:new Date(context.snapshot.timestamp || Date.now()) }) : authorityAssessment;
  const authorized = Boolean(actionId) && missingPermissions.length === 0 && authorityAssessment.authorized;
  const canAuthorizeWithConfirmation = Boolean(actionId) && missingPermissions.length === 0 && confirmationAssessment.authorized;
  const premiseRefs = [
    { artifactId: forge.artifact.id, versionHash: forge.artifact.versionHash },
    context.premiseRef('world:current'),
    context.premiseRef(`hypotheses:${entity.id}`),
    context.premiseRef('authority:grants'),
    context.premiseRef('execution:footprints')
  ];
  const artifact = makeArtifact('authorization', `harbour:${entity.id}`, {
    recommendationId: forge.artifact.id,
    actionId,
    authorizationGrantId: grant?.id || null,
    authorized,
    canAuthorizeWithConfirmation,
    requiresPrincipalSignoff: authorityAssessment.requiresPrincipalSignoff,
    reversibility: footprint?.reversibility || null,
    affectedParties: footprint?.affectedParties || action?.affectedParties || [],
    requiredPermissions: permissionFacts,
    authorityBasis: authorized
      ? [`Authority grant ${grant?.id || 'none'} currently has sufficient scope and capacity.`]
      : [...missingPermissions.map(x => `Missing permission: ${x}`), ...(authorityAssessment.reasons || [])]
  }, premiseRefs);
  return {
    lens: 'harbour', entityId: entity.id, title: entity.title,
    question: 'What would cross into reality, who is affected, and is lawful authority available?',
    recommendationId: forge.artifact.id, actionId, requiredAuthority,
    requiredPermissions: permissionFacts, missingPermissions,
    authorized, canAuthorizeWithConfirmation, requiresPrincipalSignoff: authorityAssessment.requiresPrincipalSignoff,
    authorityGrant: grant ? structuredCloneSafe(grant) : null,
    authorityAssessment,
    footprint,
    affectedParties: footprint?.affectedParties || action?.affectedParties || [],
    artifact
  };
}


function financialCommitmentOf(footprint) {
  return (footprint?.resourceCommitments || [])
    .filter(x => x.resourceType === 'currency')
    .reduce((sum, x) => sum + Number(x.amount || 0), 0);
}

function defaultExecutionFootprint(action) {
  if (!action) return null;
  return {
    actionId: action.id,
    actionType: ({DIRECT_PROGRESS:'internal_change',CONSTRAINT_RELIEF:'internal_change',INFORMATION_GAIN:'research',OPTION_CREATION:'internal_change'})[action.mechanism] || 'internal_change',
    domain: 'internal',
    affectedParties: action.affectedParties || [],
    resourceCommitments: [], obligationsCreated: [], disclosures: [],
    reversibility: {
      class:'freely_reversible', requiresThirdPartyCooperation:false, irreversibleDimensions:[]
    },
    expectedWorldChanges: []
  };
}

export function assessAuthorityGrant({ action, footprint, grant, principalSignoff = false, now = new Date() }) {
  const reasons = [];
  if (!grant) return { authorized:false, reasons:['No authority grant bound to action.'], requiresPrincipalSignoff:false, available:null };
  const at = new Date(now);
  let effectiveStatus = grant.status;
  if (grant.expiresAt && at > new Date(grant.expiresAt)) effectiveStatus = 'expired';
  if (effectiveStatus !== 'active') reasons.push(`Authority grant is ${effectiveStatus}.`);
  const actionType = footprint?.actionType || ({DIRECT_PROGRESS:'internal_change',CONSTRAINT_RELIEF:'internal_change',INFORMATION_GAIN:'research',OPTION_CREATION:'internal_change'})[action?.mechanism] || 'internal_change';
  const domain = footprint?.domain || 'internal';
  const allowedTypes = grant.scope?.allowedActionTypes || [];
  const domains = grant.scope?.domainRestrictions || [];
  if (allowedTypes.length && !allowedTypes.includes(actionType)) reasons.push(`Action type '${actionType}' is outside grant scope.`);
  if (domains.length && !domains.includes(domain)) reasons.push(`Domain '${domain}' is outside grant scope.`);
  const financial = financialCommitmentOf(footprint);
  const maxFinancial = grant.limits?.maxFinancialCommitment ?? Infinity;
  const maxExecutions = grant.limits?.maxExecutions ?? Infinity;
  const available = {
    financialCommitment: maxFinancial - Number(grant.consumed?.financialCommitment || 0) - Number(grant.reserved?.financialCommitment || 0),
    executionCount: maxExecutions - Number(grant.consumed?.executionCount || 0) - Number(grant.reserved?.executionCount || 0)
  };
  if (financial > available.financialCommitment) reasons.push(`Financial authority shortfall: needs ${financial}, available ${available.financialCommitment}.`);
  if (available.executionCount < 1) reasons.push('Execution-count authority exhausted or fully reserved.');
  const confirmationRequiredByMode = ['recommend_only','user_confirmation_required','prohibited_autonomous'].includes(action?.authority) && !principalSignoff;
  if (confirmationRequiredByMode) reasons.push(`Explicit principal confirmation required for execution mode '${action.authority}'.`);
  const reversalClass = footprint?.reversibility?.class || 'freely_reversible';
  const highIrreversibility = ['practically_irreversible','strictly_irreversible'].includes(reversalClass);
  const temporaryOrLowRisk = grant.authorityClass === 'delegated_low_risk' || Boolean(grant.expiresAt);
  const reversibilitySignoffRequired = highIrreversibility && temporaryOrLowRisk && !principalSignoff;
  if (reversibilitySignoffRequired) reasons.push(`Principal sign-off required for ${reversalClass} action under this grant.`);
  const requiresPrincipalSignoff = confirmationRequiredByMode || reversibilitySignoffRequired;
  return { authorized:reasons.length===0, reasons, requiresPrincipalSignoff, confirmationRequiredByMode, reversibilitySignoffRequired, available, financialCommitment:financial, effectiveStatus };
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const x of Object.values(value)) deepFreeze(x);
  return value;
}

function remedialTypeFor(reversibility) {
  const cls = reversibility?.class || 'practically_irreversible';
  if (cls === 'freely_reversible' || cls === 'costly_reversible') return 'reverse';
  if (cls === 'compensable') return 'compensate';
  if (cls === 'practically_irreversible') return (reversibility?.irreversibleDimensions || []).includes('relational') ? 'repair' : 'disclose';
  return 'accept';
}

export class AgencyHorizon {
  constructor({ grants = [], kernel = null, now = () => new Date() } = {}) {
    this.kernel = kernel;
    this.now = now;
    this.grants = new Map(grants.map(g => [g.id, structuredCloneSafe(g)]));
    this.reservations = new Map();
    this.executionRecords = new Map();
    this.reconciliations = new Map();
    this.remedialRequirements = new Map();
    this.observatoryIncoming = [];
  }

  getGrant(id) { const g=this.grants.get(id); return g ? structuredCloneSafe(g) : null; }
  getGrants() { return [...this.grants.values()].map(structuredCloneSafe); }
  getReservations() { return [...this.reservations.values()].map(structuredCloneSafe); }
  getExecutionRecords() { return [...this.executionRecords.values()].map(structuredCloneSafe); }
  getRemedialRequirements() { return [...this.remedialRequirements.values()].map(structuredCloneSafe); }
  getObservatoryIncoming() { return structuredCloneSafe(this.observatoryIncoming); }

  reserve({ reservationId, action, footprint, grantId, recommendation, authorization, principalSignoff = false }) {
    if (this.reservations.has(reservationId)) throw new Error(`Reservation ${reservationId} already exists.`);
    const grant = this.grants.get(grantId);
    const assessment = assessAuthorityGrant({ action, footprint, grant, principalSignoff, now:this.now() });
    if (!assessment.authorized) return { ok:false, assessment };
    // Atomic in this single-threaded runtime: assessment and mutation occur in one synchronous turn.
    const financial = assessment.financialCommitment || 0;
    grant.reserved = grant.reserved || { financialCommitment:0, executionCount:0 };
    grant.reserved.financialCommitment += financial;
    grant.reserved.executionCount += 1;
    const reservationArtifact = makeArtifact('capacity_reservation', `reservation:${reservationId}`, {
      reservationId, actionId:action.id, grantId, recommendationId:recommendation.id,
      authorizationId:authorization.id, reservedCapacity:{financialCommitment:financial,executionCount:1},
      reservedAt:this.now(), reversibility:structuredCloneSafe(footprint?.reversibility || null)
    },[
      {artifactId:recommendation.id,versionHash:recommendation.versionHash},
      {artifactId:authorization.id,versionHash:authorization.versionHash}
    ]);
    const reservation = {
      id:reservationId, actionId:action.id, grantId, recommendationId:recommendation.id,
      authorizationId:authorization.id, footprint:structuredCloneSafe(footprint),
      capacity:{financialCommitment:financial,executionCount:1}, status:'reserved', reservedAt:this.now(),
      artifact:reservationArtifact
    };
    this.reservations.set(reservationId,reservation);
    if (this.kernel) this.kernel.registerArtifact(LAYERS.HARBOUR,reservationArtifact);
    return { ok:true, reservation:structuredCloneSafe(reservation), grant:this.getGrant(grantId), assessment };
  }

  beginExecution(reservationId) {
    const r=this.reservations.get(reservationId);
    if (!r || r.status!=='reserved') throw new Error(`Reservation ${reservationId} is not executable.`);
    r.status='executing'; r.executingAt=this.now();
    return structuredCloneSafe(r);
  }

  releaseReservation(reservationId, reason = 'Reservation released before execution.') {
    const r=this.reservations.get(reservationId);
    if (!r || !['reserved','executing'].includes(r.status)) return false;
    const grant=this.grants.get(r.grantId);
    grant.reserved.financialCommitment = Math.max(0, grant.reserved.financialCommitment - r.capacity.financialCommitment);
    grant.reserved.executionCount = Math.max(0, grant.reserved.executionCount - r.capacity.executionCount);
    r.status='released'; r.releasedAt=this.now(); r.releaseReason=reason;
    return true;
  }

  execute({ reservationId, action, recommendation, authorization, result='completed' }) {
    const r=this.reservations.get(reservationId);
    if (!r || !['reserved','executing'].includes(r.status)) throw new Error(`Reservation ${reservationId} is not in executable state.`);
    if (this.kernel) {
      const validity=this.kernel.verifyArtifactTree(r.artifact.id);
      if (!validity.valid) {
        this.releaseReservation(reservationId, `Premise tree invalidated before execution: ${validity.problems.join('; ')}`);
        throw new Error(`Execution blocked: reservation premise tree is no longer valid: ${validity.problems.join('; ')}`);
      }
    }
    const grant=this.grants.get(r.grantId);
    const crossed = result !== 'failed';
    grant.reserved.financialCommitment -= r.capacity.financialCommitment;
    grant.reserved.executionCount -= r.capacity.executionCount;
    if (crossed) {
      grant.consumed.financialCommitment += r.capacity.financialCommitment;
      grant.consumed.executionCount += r.capacity.executionCount;
    }
    r.status = crossed ? 'executed' : 'failed';
    r.completedAt=this.now();
    if (grant.limits?.maxExecutions != null && grant.consumed.executionCount >= grant.limits.maxExecutions) grant.status='exhausted';
    if (grant.limits?.maxFinancialCommitment != null && grant.consumed.financialCommitment >= grant.limits.maxFinancialCommitment) grant.status='exhausted';

    const executionId=`execution:${action.id}:${new Date(this.now()).getTime()}`;
    const premiseSnapshot = [
      ...(recommendation.premiseRefs || []),
      {artifactId:recommendation.id,versionHash:recommendation.versionHash},
      {artifactId:authorization.id,versionHash:authorization.versionHash},
      {artifactId:r.artifact.id,versionHash:r.artifact.versionHash}
    ];
    const artifact=makeArtifact('execution_record',executionId,{
      historicalFact:true, actionId:action.id, recommendationId:recommendation.id,
      authorizationId:authorization.id, reservationId:r.artifact.id, authorizationGrantId:r.grantId,
      executedAt:this.now(), premiseSnapshot, footprint:structuredCloneSafe(r.footprint),
      lifecycleState:crossed?'executed':'failed', result,
      // Consequences observed later belong to reconciliation, not this immutable fact.
      observedConsequencesAtBoundary:[]
    },[
      {artifactId:recommendation.id,versionHash:recommendation.versionHash},
      {artifactId:authorization.id,versionHash:authorization.versionHash},
      {artifactId:r.artifact.id,versionHash:r.artifact.versionHash}
    ]);
    const sealed=deepFreeze(structuredCloneSafe(artifact));
    this.executionRecords.set(executionId,sealed);
    if (this.kernel) {
      this.kernel.sealArtifactAsHistorical(r.artifact.id, `Reservation ${reservationId} consumed by ${executionId}.`);
      this.kernel.registerHistoricalArtifact(LAYERS.HARBOUR,sealed);
      this.kernel.markJudgmentExecuted(recommendation.id,executionId,sealed.executedAt);
    }
    return { record:structuredCloneSafe(sealed), grant:this.getGrant(r.grantId) };
  }

  reconcile({ executionId, observedConsequences = [], premiseDrift = false, driftReason = '' }) {
    const execution=this.executionRecords.get(executionId);
    if (!execution) throw new Error(`Execution ${executionId} not found.`);
    const reconciliationId=`reconcile:${executionId}`;
    const reconciliation=makeArtifact('reconciliation_record',reconciliationId,{
      executionId, reconciledAt:this.now(), observedConsequences:structuredCloneSafe(observedConsequences),
      premiseDrift, driftReason
    },[{artifactId:execution.id,versionHash:execution.versionHash}]);
    this.reconciliations.set(reconciliationId,deepFreeze(structuredCloneSafe(reconciliation)));
    if (this.kernel) this.kernel.registerArtifact(LAYERS.HARBOUR,reconciliation);

    const outcome=makeArtifact('outcome_record',`outcome:${executionId}`,{
      executionId, reconciliationId, observedAt:this.now(), consequences:structuredCloneSafe(observedConsequences), premiseDrift, driftReason
    },[{artifactId:reconciliation.id,versionHash:reconciliation.versionHash}]);
    if (this.kernel) this.kernel.registerArtifact(LAYERS.OBSERVATORY,outcome);
    this.observatoryIncoming.push({type:'outcome_record',artifact:structuredCloneSafe(outcome)});

    let remedial=null;
    if (premiseDrift && execution.result !== 'failed') {
      const type=remedialTypeFor(execution.footprint?.reversibility);
      remedial=makeArtifact('remedial_requirement',`remedial:${executionId}`,{
        executionId, type, reason:driftReason || 'Post-execution premise drift requires review.',
        requiredAuthorityScope: type==='accept'?[]:['remediation'], status:'pending'
      },[{artifactId:execution.id,versionHash:execution.versionHash},{artifactId:outcome.id,versionHash:outcome.versionHash}]);
      this.remedialRequirements.set(remedial.id,structuredCloneSafe(remedial));
      if (this.kernel) this.kernel.registerArtifact(LAYERS.HARBOUR,remedial);
      this.observatoryIncoming.push({type:'remedial_requirement',artifact:structuredCloneSafe(remedial)});
    }
    if (this.kernel) this.kernel.clearHistoricalReview(executionId);
    return { reconciliation:structuredCloneSafe(reconciliation), outcome:structuredCloneSafe(outcome), remedial:remedial?structuredCloneSafe(remedial):null };
  }
}

export function projectEntity(lens, entity, context) {
  switch (lens) {
    case 'observatory': return evaluateObservatory(entity, context);
    case 'garden': return evaluateGarden(entity, context);
    case 'crossroads': return detectCrossroads(entity, context);
    case 'forge': return evaluateForge(entity, context);
    case 'harbour': return evaluateHarbour(entity, context);
    default: throw new Error(`Unknown lens ${lens}`);
  }
}

export function createContext({
  entities, hypotheses, snapshot, policies, activePolicy, statusQuoValues,
  uncertaintyModels = [], generatorConfig = DEFAULT_GARDEN_GENERATOR_CONFIG,
  authorityGrants = [], executionFootprints = {}
}) {
  const entityMap = new Map(entities.map(e => [e.id, e]));
  const seedHypotheses = structuredCloneSafe(hypotheses || []);
  const uncertaintyVersion = entityId => stableHash(uncertaintyModels.filter(m => m.entityId === entityId));
  const context = {
    entities,
    entityMap,
    reverseIndex: buildReverseDependencyIndex(entities),
    seedHypotheses,
    hypotheses:[],
    hypothesisSets:new Map(),
    snapshot,
    policies,
    activePolicy,
    statusQuoValues,
    uncertaintyModels,
    generatorConfig,
    authorityGrants,
    executionFootprints
  };

  for (const entity of entities) {
    context.hypothesisSets.set(entity.id, generateHypothesisSet(entity, context));
  }
  context.hypotheses = [...context.hypothesisSets.values()].flatMap(set => set.candidateActions);

  const versions = new Map([
    ['graph:canonical', stableHash(entities)],
    ['world:current', stableHash(snapshot)],
    ['policies:catalog', stableHash(policies)],
    ['policy:selected', selectedPolicyDirective(activePolicy, policies).versionHash],
    ['garden-generator:config', stableHash(generatorConfig)],
    ['authority:grants', stableHash(authorityGrants)],
    ['execution:footprints', stableHash(executionFootprints)],
    ...entities.map(e => [`entity:${e.id}`, stableHash(e)]),
    ...entities.map(e => [`hypothesis-seeds:${e.id}`, stableHash(seedHypotheses.filter(a => a.entityId === e.id))]),
    ...entities.map(e => [`hypotheses:${e.id}`, context.hypothesisSets.get(e.id).artifact.versionHash]),
    ...entities.map(e => [`uncertainty:${e.id}`, uncertaintyVersion(e.id)])
  ]);
  context.premiseRef = id => {
    const versionHash = versions.get(id);
    if (!versionHash) throw new Error(`No registered premise version mapping for ${id}`);
    return { artifactId: id, versionHash };
  };
  return context;
}

export function selectedPolicyDirective(activePolicy, policies) {
  const premiseRefs = [{ artifactId: 'policies:catalog', versionHash: stableHash(policies) }];
  const artifact = makeArtifact('normative_directive', 'policy:selected', {
    policyId: activePolicy.id,
    weightMap: activePolicy.weights,
    rationale: activePolicy.rationale,
    authorityId: activePolicy.authority.selectedBy,
    status: activePolicy.status
  }, premiseRefs);
  return artifact;
}

export function registerRuntimePremises(kernel, context) {
  const results = [];
  results.push(kernel.registerPremise(makePremise('graph:canonical', 'canonical_graph', context.entities, stableHash(context.entities))));
  results.push(kernel.registerPremise(makePremise('world:current', 'world_snapshot', context.snapshot, stableHash(context.snapshot))));
  results.push(kernel.registerPremise(makePremise('policies:catalog', 'normative_policy_catalog', context.policies, stableHash(context.policies))));
  results.push(kernel.registerPremise(makePremise('garden-generator:config', 'garden_generator_config', context.generatorConfig, stableHash(context.generatorConfig))));
  results.push(kernel.registerPremise(makePremise('authority:grants', 'authority_grant_catalog', context.authorityGrants || [], stableHash(context.authorityGrants || []))));
  results.push(kernel.registerPremise(makePremise('execution:footprints', 'execution_footprint_catalog', context.executionFootprints || {}, stableHash(context.executionFootprints || {}))));
  for (const entity of context.entities) {
    results.push(kernel.registerPremise(makePremise(`entity:${entity.id}`, 'canonical_entity', entity, stableHash(entity))));
    const seeds = context.seedHypotheses.filter(a => a.entityId === entity.id);
    results.push(kernel.registerPremise(makePremise(`hypothesis-seeds:${entity.id}`, 'action_hypothesis_seed_set', seeds, stableHash(seeds))));
    const uncertainty = (context.uncertaintyModels || []).filter(m => m.entityId === entity.id);
    results.push(kernel.registerPremise(makePremise(`uncertainty:${entity.id}`, 'joint_uncertainty_model', uncertainty, stableHash(uncertainty))));
  }
  results.push(kernel.registerArtifact(LAYERS.CROSSROADS, selectedPolicyDirective(context.activePolicy, context.policies)));
  return results;
}

// Backward-compatible alias retained for v1 callers. v1.1 registers the whole premise universe,
// because a derived artifact may depend on graph/world/policy state beyond one entity.
export function registerPremiseArtifacts(kernel, _entity, context) {
  return registerRuntimePremises(kernel, context);
}

export function outcomeRecord({ hypothesisId, predictedSuccess, observedSuccess, predictedMagnitude, observedMagnitude, timeToEffectMs }) {
  return { hypothesisId, predictedSuccess, observedSuccess, predictedMagnitude, observedMagnitude, timeToEffectMs, recordedAt: new Date() };
}

function round2(n) { return Math.round((Number(n) + Number.EPSILON) * 100) / 100; }
function mapRound(obj) { return Object.fromEntries(Object.entries(obj).map(([k,v]) => [k, round2(v)])); }
function structuredCloneSafe(value) { return typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value)); }


// ============================================================================
// v1.2 · JOINT UNCERTAINTY & DECISION SURFACE ANALYSIS
// Uncertainty is sampled upstream. Every sampled world is re-evaluated from
// canonical data through action effects, normalization and the selected policy.
// ============================================================================

export function createEvaluationModel({ entities, hypotheses, snapshot, policies, statusQuoValues, generatorConfig = DEFAULT_GARDEN_GENERATOR_CONFIG }) {
  return structuredCloneSafe({ entities, hypotheses, snapshot, policies, statusQuoValues, generatorConfig });
}

export function modelPathGet(model, path) {
  const { root, tokens } = resolveModelPath(model, path);
  let current = root;
  for (const token of tokens) {
    if (current == null || !(token in current)) throw new Error(`Cannot read model path ${path} at ${token}`);
    current = current[token];
  }
  return current;
}

export function modelPathSet(model, path, value) {
  const { root, tokens } = resolveModelPath(model, path);
  if (!tokens.length) throw new Error(`Cannot replace model root with path ${path}`);
  let current = root;
  for (const token of tokens.slice(0, -1)) {
    if (current == null || !(token in current)) throw new Error(`Cannot write model path ${path} at ${token}`);
    current = current[token];
  }
  current[tokens.at(-1)] = value;
  return model;
}

function resolveModelPath(model, path) {
  const [head, ...tail] = String(path).split('.');
  const [scope, id] = head.split(':');
  let root;
  if (scope === 'hypothesis') root = model.hypotheses.find(x => x.id === id);
  else if (scope === 'entity') root = model.entities.find(x => x.id === id);
  else if (scope === 'policy') root = model.policies.find(x => x.id === id);
  else if (scope === 'snapshot') { root = model.snapshot; if (id) tail.unshift(id); }
  else if (scope === 'statusquo') { root = model.statusQuoValues; if (id) tail.unshift(id); }
  else throw new Error(`Unknown model path scope '${scope}' in ${path}`);
  if (!root) throw new Error(`Model path root not found: ${head}`);
  return { root, tokens: tail.map(t => /^\d+$/.test(t) ? Number(t) : t) };
}

export function mulberry32(seed = 1) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function standardNormal(rng) {
  let u = 0, v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function choleskyDecompose(matrix) {
  const n = matrix.length;
  if (!n || matrix.some(row => row.length !== n)) throw new Error('Correlation matrix must be square.');
  const L = Array.from({length:n}, () => Array(n).fill(0));
  for (let i=0;i<n;i++) {
    for (let j=0;j<=i;j++) {
      let sum = 0;
      for (let k=0;k<j;k++) sum += L[i][k] * L[j][k];
      if (i === j) {
        const diagonal = matrix[i][i] - sum;
        if (diagonal < -1e-10) throw new Error('Correlation matrix is not positive semidefinite.');
        L[i][j] = Math.sqrt(Math.max(0, diagonal));
      } else {
        if (Math.abs(L[j][j]) < 1e-12) L[i][j] = 0;
        else L[i][j] = (matrix[i][j] - sum) / L[j][j];
      }
    }
  }
  return L;
}

function correlatedNormals(count, correlationMatrix, rng) {
  const matrix = correlationMatrix || Array.from({length:count}, (_,i) => Array.from({length:count},(_,j)=>i===j?1:0));
  if (matrix.length !== count) throw new Error(`Correlation matrix size ${matrix.length} does not match ${count} parameters.`);
  const L = choleskyDecompose(matrix);
  const independent = Array.from({length:count}, () => standardNormal(rng));
  return L.map(row => row.reduce((sum, coeff, j) => sum + coeff * independent[j], 0));
}

function chooseScenario(scenarios, rng) {
  if (!scenarios?.length) return null;
  const total = scenarios.reduce((s,x)=>s+Math.max(0,Number(x.weight)||0),0);
  if (total <= 0) return scenarios[0];
  let r = rng() * total;
  for (const scenario of scenarios) {
    r -= Math.max(0,Number(scenario.weight)||0);
    if (r <= 0) return scenario;
  }
  return scenarios.at(-1);
}

function sampleDistribution(distribution, baseValue, z, rng) {
  const d = distribution || {type:'bounded_normal'};
  if (d.type === 'fixed') return d.value ?? baseValue;
  if (d.type === 'uniform') {
    const min = Number(d.min ?? 0), max = Number(d.max ?? 1);
    return min + (max-min) * rng();
  }
  const mean = Number(d.mean ?? baseValue ?? 0);
  const sd = Math.max(0, Number(d.sd ?? 0));
  let sampled = mean + sd * z;
  if (d.min != null) sampled = Math.max(Number(d.min), sampled);
  if (d.max != null) sampled = Math.min(Number(d.max), sampled);
  return sampled;
}

export function samplePlausibleModel(baseModel, uncertaintyModel, rng = Math.random) {
  const model = structuredCloneSafe(baseModel);
  const scenario = chooseScenario(uncertaintyModel.scenarios || [], rng);
  for (const [path, value] of Object.entries(scenario?.overrides || {})) modelPathSet(model, path, value);

  const params = uncertaintyModel.parameters || [];
  const z = correlatedNormals(params.length, uncertaintyModel.correlationMatrix, rng);
  const sampledParameters = {};
  params.forEach((parameter, i) => {
    const base = modelPathGet(model, parameter.path);
    const sampled = sampleDistribution(parameter.distribution, base, z[i], rng);
    modelPathSet(model, parameter.path, sampled);
    sampledParameters[parameter.id] = sampled;
  });
  return { model, scenarioId: scenario?.id ?? null, sampledParameters };
}

export function rankActionsForPolicy(entity, context, policy = context.activePolicy) {
  const actions = context.hypotheses.filter(a => a.entityId === entity.id);
  const evaluated = actions.map(a => evaluateAction(a, entity, context, policy));
  const feasible = evaluated.filter(x => Number.isFinite(x.score)).sort((a,b)=>b.score-a.score);
  const statusQuo = Number(context.statusQuoValues?.[entity.id] ?? 0);
  if (!feasible.length) return { winnerId:'__NO_FEASIBLE_ACTION__', winner:null, statusQuo, evaluated };
  if (feasible[0].score <= statusQuo) return { winnerId:'__STATUS_QUO__', winner:null, statusQuo, evaluated };
  return { winnerId:feasible[0].action.id, winner:feasible[0], statusQuo, evaluated };
}

function contextFromModel(model, activePolicyId, uncertaintyModels = []) {
  const policy = model.policies.find(p=>p.id===activePolicyId) || model.policies[0];
  if (!policy) throw new Error(`Policy ${activePolicyId} not found.`);
  return createContext({
    entities:model.entities, hypotheses:model.hypotheses, snapshot:model.snapshot,
    policies:model.policies, activePolicy:policy, statusQuoValues:model.statusQuoValues,
    uncertaintyModels, generatorConfig:model.generatorConfig || DEFAULT_GARDEN_GENERATOR_CONFIG
  });
}

export function evaluateRobustness({
  baseModel, entityId, activePolicyId, uncertaintyModel,
  runs = 2000, seed = 20260811, kernel = null, guardArtifactId = null
}) {
  if (!uncertaintyModel) throw new Error(`No uncertainty model supplied for ${entityId}.`);
  if (kernel && guardArtifactId) {
    const guard = kernel.verifyArtifactTree(guardArtifactId);
    if (!guard.valid) throw new PremiseIntegrityError(guardArtifactId, guard.problems);
  }
  const rng = mulberry32(seed);
  const winCounts = new Map();
  const scenarioCounts = new Map();
  const parameterMoments = new Map((uncertaintyModel.parameters||[]).map(p=>[p.id,{sum:0,sumSq:0,n:0}]));
  let baseWinnerId = null;

  for (let i=0;i<runs;i++) {
    const sampled = samplePlausibleModel(baseModel, uncertaintyModel, rng);
    scenarioCounts.set(sampled.scenarioId || '__none__', (scenarioCounts.get(sampled.scenarioId || '__none__')||0)+1);
    for (const [id,value] of Object.entries(sampled.sampledParameters)) {
      const m=parameterMoments.get(id); if (!m) continue; m.sum+=value; m.sumSq+=value*value; m.n++;
    }
    const ctx = contextFromModel(sampled.model, activePolicyId, [uncertaintyModel]);
    const entity = ctx.entityMap.get(entityId);
    if (!entity) throw new Error(`Entity ${entityId} not found in sampled model.`);
    const ranked = rankActionsForPolicy(entity, ctx, ctx.activePolicy);
    winCounts.set(ranked.winnerId,(winCounts.get(ranked.winnerId)||0)+1);
  }

  const baseCtx = contextFromModel(baseModel, activePolicyId, [uncertaintyModel]);
  const baseEntity = baseCtx.entityMap.get(entityId);
  baseWinnerId = rankActionsForPolicy(baseEntity, baseCtx, baseCtx.activePolicy).winnerId;
  const sorted = [...winCounts.entries()].sort((a,b)=>b[1]-a[1]);
  const modalWinnerId = sorted[0]?.[0] ?? '__NONE__';
  const robustnessFrequency = runs ? (winCounts.get(baseWinnerId)||0)/runs : 0;
  const modalFrequency = runs ? (winCounts.get(modalWinnerId)||0)/runs : 0;
  const parameterSummary = Object.fromEntries([...parameterMoments.entries()].map(([id,m])=>{
    const mean=m.n?m.sum/m.n:0; const variance=m.n?Math.max(0,m.sumSq/m.n-mean*mean):0;
    return [id,{mean:round4(mean),sd:round4(Math.sqrt(variance))}];
  }));
  return {
    entityId, policyId:activePolicyId, modelId:uncertaintyModel.id, runs, seed,
    baseWinnerId, modalWinnerId,
    robustnessFrequency:round4(robustnessFrequency), modalFrequency:round4(modalFrequency),
    distribution:Object.fromEntries(sorted.map(([id,count])=>[id,{count,frequency:round4(count/runs)}])),
    scenarioDistribution:Object.fromEntries([...scenarioCounts.entries()].map(([id,count])=>[id,{count,frequency:round4(count/runs)}])),
    parameterSummary,
    interpretation:`Base winner '${baseWinnerId}' remained first in ${round2(robustnessFrequency*100)}% of sampled plausible worlds under uncertainty model '${uncertaintyModel.id}'.`,
    caveat:'Robustness frequency is conditional on the declared distributions, correlations, scenarios, Garden hypothesis set/search coverage and decision policy. It is not epistemic confidence or objective probability of correctness.'
  };
}

export function robustnessArtifact(profile, context, uncertaintyModel) {
  return makeArtifact('epistemic_claim', `robust:${profile.entityId}`, {
    proposition: profile.interpretation,
    confidence: null,
    evidenceIds: [],
    observedAt: context.snapshot.timestamp,
    robustnessFrequency: profile.robustnessFrequency,
    uncertaintyModelId: uncertaintyModel.id,
    caveat: profile.caveat
  }, [
    context.premiseRef(`entity:${profile.entityId}`),
    context.premiseRef(`hypotheses:${profile.entityId}`),
    context.premiseRef('world:current'),
    context.premiseRef('policy:selected'),
    context.premiseRef(`uncertainty:${profile.entityId}`)
  ]);
}

export function mapDecisionSurface({
  baseModel, entityId, activePolicyId, parameterPath, domain,
  resolution = 120, refineIterations = 18, uncertaintyModels = []
}) {
  if (!Array.isArray(domain) || domain.length !== 2 || !(domain[1] > domain[0])) throw new Error('Decision surface domain must be [min,max].');
  const step = (domain[1]-domain[0]) / resolution;
  const evaluateAt = x => {
    const model = structuredCloneSafe(baseModel);
    modelPathSet(model, parameterPath, x);
    const ctx = contextFromModel(model, activePolicyId, uncertaintyModels);
    const entity = ctx.entityMap.get(entityId);
    const rank = rankActionsForPolicy(entity, ctx, ctx.activePolicy);
    return { x, winnerId:rank.winnerId, score:rank.winner?.score ?? rank.statusQuo };
  };
  const samples = [];
  for (let i=0;i<=resolution;i++) samples.push(evaluateAt(domain[0]+i*step));

  const transitions = [];
  for (let i=1;i<samples.length;i++) {
    const left=samples[i-1], right=samples[i];
    if (left.winnerId===right.winnerId) continue;
    let lo=left.x, hi=right.x, leftWinner=left.winnerId, rightWinner=right.winnerId;
    for (let j=0;j<refineIterations;j++) {
      const mid=(lo+hi)/2, m=evaluateAt(mid);
      if (m.winnerId===leftWinner) lo=mid;
      else hi=mid;
    }
    transitions.push({ at:round6((lo+hi)/2), from:leftWinner, to:rightWinner, bracket:[left.x,right.x] });
  }

  const regions=[];
  let start=domain[0], winner=samples[0].winnerId;
  for (const transition of transitions) {
    regions.push({ range:[round6(start),transition.at], winningActionId:winner });
    start=transition.at; winner=transition.to;
  }
  regions.push({ range:[round6(start),round6(domain[1])], winningActionId:winner });

  return {
    entityId, policyId:activePolicyId, parameterPath, domain, resolution,
    detectionStep:round6(step), transitions, regions,
    distinctWinners:[...new Set(regions.map(r=>r.winningActionId))],
    caveat:`Transitions narrower than the coarse sweep step (${round6(step)}) can be missed if the winner changes and changes back between sampled grid points. Observed transitions are locally refined after detection.`
  };
}

function round4(n) { return Math.round((Number(n)+Number.EPSILON)*10000)/10000; }
function round6(n) { return Math.round((Number(n)+Number.EPSILON)*1000000)/1000000; }


export function decisionSurfaceArtifact(profile, context, uncertaintyModel) {
  const regionsText = profile.regions.map(r => `${r.range[0]}–${r.range[1]}: ${r.winningActionId}`).join('; ');
  return makeArtifact('epistemic_claim', `surface:${profile.entityId}`, {
    proposition: `Decision surface for ${profile.parameterPath} under policy '${profile.policyId}': ${regionsText}`,
    confidence: null,
    evidenceIds: [],
    observedAt: context.snapshot.timestamp,
    parameterPath: profile.parameterPath,
    detectionStep: profile.detectionStep,
    caveat: profile.caveat
  }, [
    context.premiseRef(`entity:${profile.entityId}`),
    context.premiseRef(`hypotheses:${profile.entityId}`),
    context.premiseRef('world:current'),
    context.premiseRef('policy:selected'),
    context.premiseRef(`uncertainty:${profile.entityId}`)
  ]);
}
