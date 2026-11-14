# Intake analysis: Game of Becoming

- **Source:** [GitHub issue #2](https://github.com/rxe-alt788/Observatory/issues/2)
- **Preserved source record:** [current.md](current.md)
- **Analysis status:** AI-generated first-pass analysis
- **Version:** 0.1
- **Important:** This file is a derived interpretation. It does not replace or modify the original submission.

## 1. What was submitted

A consolidated record of **The Game of Becoming**, described as an ongoing practical framework for deliberate personal and collective change. Its central proposition is that becoming is continuous, and that the process should be made deliberate through action.

The submission combines:
- An overview and claimed milestones across awareness, deconstruction and intentional action.
- A central philosophical account of becoming as transformation through changing states.
- The **Prime Rule**: when a request can be answered by making the thing, make the thing.
- A description of an existing minimal HTML interface with six randomly selected action prompts.
- A human-machine operating model: **human intention + machine capability + action**.
- Five criteria for judging a move: usable output, reduced delay, new affordance, verifiability and improved position.
- A proposed NOTICE → SELECT → MAKE → VERIFY → LEARN → RE-ENTER cycle.
- Open design questions about moves, evidence, retained progress, failure and collective use.

## 2. Core model extracted

**Becoming loop**

Become → recognise the new form → discover its limits → transform again.

A new state creates both possibilities and constraints. The player notices these, acts, and enters a changed situation. There is no assumed final identity or terminal state.

**Operational loop**

NOTICE → SELECT → MAKE → VERIFY → LEARN → RE-ENTER.

This is the proposed practical cycle in the submitted material, not a claim that the current prototype already implements it.

**Human-machine division**

- Human: intention, context, judgement, values and assessment of consequences.
- Machine: perception, organisation, compression, transformation, repeatable execution and testing support.
- Joint: identify an opportunity, select a move, make or execute it, verify the change and retain what was learned.

## 3. Design principles

1. Action takes precedence over commentary when action is possible.
2. A move should change a real condition, not merely produce a conversation.
3. Outputs should be usable and their effects verifiable.
4. Failure should produce information without being relabelled as success.
5. Progress should increase capacity and available action, not merely accumulate completed tasks.
6. A new capability changes the terrain and may expose new constraints.
7. The machine supports the player; it does not become the protagonist or final judge of value.

## 4. Candidate object model

These are proposed data objects for a future implementation, inferred from the source's stated requirements.

| Object | Minimum fields |
|---|---|
| Move | id, situation, intended_change, selected_action, status |
| Output | id, move_id, description, artifact_uri |
| Evidence | id, move_id, evidence_type, source_uri, observation |
| Capability | id, description, demonstrated_by_move |
| Constraint | id, description, affected_move_or_state |
| Reflection | id, move_id, learning, next_move |
| Player state | current_state, active_moves, demonstrated_capabilities, unresolved_constraints |

Suggested move statuses: **proposed, attempted, completed, verified, blocked, abandoned**. These are a proposed vocabulary, not existing functionality.

## 5. What is established, proposed and unknown

### Explicitly present in the submission
- The central premise and transformation loop.
- The Prime Rule.
- Five criteria for judging a move.
- The human-machine division of roles.
- The six action prompts in the described HTML prototype.
- The NOTICE-to-RE-ENTER cycle as a proposed next version.
- A list of unresolved design questions.

### Proposed, not yet demonstrated
- A persistent player state.
- A move ledger and progression model.
- Evidence-linked verification.
- Capability and constraint tracking.
- A scoring or evaluation system.
- A shared or collective version of the game.

### Unknown / requires inspection or testing
- Whether the referenced HTML prototype still runs as described.
- Whether any move records or player state are persisted.
- What evidence is sufficient to mark a move verified.
- Whether the five criteria should be equally weighted or treated as separate tests.
- How to represent non-linear development without turning the system into a task manager.
- How the model behaves when a move has mixed outcomes or creates costs elsewhere.

## 6. Source-quality note

The intake preserves the submitted text, but the issue body also contains an apparent accidental paste of Python/pypandoc file-generation code and terminal-style output after the consolidated record. This appears to be submission contamination, not part of the Game of Becoming model. It has been excluded from this analysis but remains untouched in the original source record.

The submission itself says the historical archive is incomplete. Accordingly, this analysis does not claim to reconstruct missing conversations or establish that every milestone was independently verified.

## 7. First practical test

Do not build a large game system yet. Test the smallest complete move record with one real move.

1. Record a current situation.
2. State the intended change.
3. Select one action that can be taken now.
4. Produce or perform the action.
5. attach observable evidence.
6. Judge whether the situation changed.
7. Record the new capability or constraint.
8. Select the next move from the changed situation.

**Pass condition:** a person can complete one move, inspect its output and evidence, and understand what has changed without relying on a motivational score or an AI assertion.

## 8. Recommended next implementation

Build a minimal **Move** record and interface before designing levels, points or elaborate progression.

The first screen needs only:
- What is the situation?
- What do you want to change?
- What is the next move?
- What did you make or do?
- What evidence shows what happened?
- What is now possible?

The system should preserve each version of the move and distinguish the player's statements from machine-generated suggestions. A machine may propose a next move; the player confirms it.

---

**Analysis boundary:** This is a first-pass extraction and design interpretation of intake #2. It is not a validated psychological model, a completed game specification, or evidence that the proposed mechanics work in practice.
