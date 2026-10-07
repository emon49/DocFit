---
name: grill-to-prd
description: Grill the developer round by round about the product idea in docs/idea.md until every decision is settled, keep GLOSSARY.md and ADRs current along the way, then write PRD.md whose features are pre-cut into OpenSpec changes (each with a kebab-case change ID and a ready-to-run /opsx:propose command). Use this whenever someone wants to turn an idea doc into a PRD, prepare a project or feature for OpenSpec, says "grill me on the idea", "write the PRD", "idea to PRD", "break this idea into OpenSpec changes", or is starting greenfield work in a repo that has docs/idea.md or an openspec/ folder, even if they never say "PRD".
---

# Grill to PRD

Turn a rough `docs/idea.md` into a `PRD.md` that developers can feed to OpenSpec one feature at a time.

```
docs/idea.md ──grill──▶ GLOSSARY.md + docs/adr/ + PRD.md ──▶ /opsx:propose <change-id>  (one per feature)
                                                              ▶ /opsx:apply ▶ /opsx:archive
```

Grilling on its own leaves most answers in the conversation, and later steps soften them (a "max 3 retries" turns into "retries a few times"; a "must NOT email guests" disappears). This skill exists to stop that: every settled answer gets an ID, lands in the PRD with its exact value, and each feature is shaped so `/opsx:propose` can lift its requirements straight into a spec delta without reinterpreting them.

The session has four phases: **orient → grill → write → verify & hand off**. Don't write `PRD.md` until the developer confirms you share one understanding.

---

## Phase 1: Orient (find facts yourself)

Facts are your job; decisions are the developer's. Before asking anything, read what exists:

- `docs/idea.md`. If it's missing, look for `idea*.md`, `docs/*.md`, or a README describing the idea, then ask for the path only if nothing fits.
- `GLOSSARY.md` (or `GLOSSARY-MAP.md` → per-context glossaries) and `docs/adr/`: existing vocabulary and settled decisions you must respect.
- An existing `PRD.md`: if present, whether to revise it or start over is a round-1 question.
- `openspec/config.yaml`, `openspec/specs/` (existing capability names, which features should reuse), and `openspec/changes/` + `openspec/changes/archive/` (change names already taken).
- The codebase: README, package manifests, source layout, existing modules relevant to the idea.

When a fact needs real digging (how auth works today, which DB is used), dispatch a sub-agent if you have one and keep going; only questions that depend on that fact wait for it.

Then give the developer a short orientation (5–8 lines): what the idea says, what the repo already has, any conflicts you spotted between the two, and how many rounds you roughly expect. Start round 1 in the same message.

---

## Phase 2: Grill

### How the interview runs

Map the idea as a **design tree**: each decision branches into the decisions that hang off it. Work it in **rounds**. The **frontier** is every decision whose prerequisites are already settled. Ask the whole frontier in one round, number each question, and give your recommended answer. Then stop and wait.

A question that depends on another question still open in the same round belongs to a later round. After each round, recompute the frontier: settled answers unlock new branches.

Format every round like this, and word each question so "yes" accepts your recommendation:

```
**Settled last round:** D-04 Guests can view but not comment · D-05 Invite links expire after 72 h · …

❓ **Q1** - **<question title>**: <question body; may include options A/B/C and the trade-off>

➡️ <your recommended answer, with a one-line reason>

---

❓ **Q2** - **<question title>**: …

➡️ …
```

Keep rounds digestible: if the frontier has more than ~7 questions, ask the 7 that unblock the most and hold the rest for the next round.

### The decision ledger

Every answer the developer gives becomes a numbered decision: `D-01`, `D-02`, … Restate them at the top of the next round under **Settled last round**, in their exact form: numbers, units, limits, orderings, and negatives ("must NOT") kept verbatim. If the developer accepts with "yes", the decision is your recommendation as worded. If they correct a restated decision, the correction replaces it under the same ID.

The ledger becomes the PRD's decision log and is what Phase 4 checks the PRD against, so precision here is what makes the PRD trustworthy.

### What the tree has to cover

Use this as a coverage map, not a script. Skip branches the idea or codebase already answers (state the answer as a fact instead of asking):

1. **Problem & users**: who has the problem, how they cope today, primary vs secondary users and roles.
2. **Goals & success**: measurable outcomes (numbers and timeframes, not "improve UX").
3. **Scope**: what's in v1, what's explicitly out (non-goals are decisions too).
4. **Feature cut**: how the idea splits into features. Each feature must work as **one OpenSpec change**: independently shippable and verifiable, small enough for one propose → apply cycle (as a rule of thumb, ≤ ~15 implementation tasks). Split anything bigger; merge anything that can't be verified alone.
5. **Per feature**: the behaviors, actors and permissions, data it creates/reads, edge cases, error and empty states, limits and defaults.
6. **Cross-cutting constraints**: performance, security, privacy, accessibility, platforms and browsers, localization, compliance.
7. **Dependencies & order**: which features need which, external services and integrations, what ships first.
8. **Risks & assumptions**: what you're betting on that could be wrong.
9. **Change IDs**: the final round always confirms the feature list with its change IDs and capabilities (see naming rules in Phase 3).

### Sharpen the language as you go

While grilling, also build the domain model:

- **Challenge against the glossary.** If the developer uses a term that conflicts with `GLOSSARY.md`, say so immediately: "Your glossary defines *Workspace* as X, but you seem to mean Y. Which is it?"
- **Sharpen fuzzy words.** For vague or overloaded terms ("user", "account", "item"), propose a precise canonical term as a question.
- **Probe with concrete scenarios.** Invent edge cases that force boundaries: "A guest's invite expires while they have the doc open. What happens?"
- **Cross-reference the code.** When the developer says how something works today, check it. Surface contradictions: "The code deletes whole Projects, but you said archived projects are restorable."
- **Update `GLOSSARY.md` the moment a term resolves**, not in a batch at the end. Create it lazily when the first term settles. It holds vocabulary only: no implementation details, no spec prose, no scratch notes.

  ```markdown
  # Glossary

  **Workspace** — A shared container of Projects owned by one Organization. A User can belong to many Workspaces.
  _Avoid:_ team, space
  _Related:_ Project, Organization
  ```

- **Offer an ADR only when all three hold:** (1) hard to reverse, (2) surprising to a future reader without context, (3) the result of a real trade-off between genuine alternatives. Otherwise the decision lives in the ledger and PRD only. Most sessions produce zero to two ADRs. Ask before writing one; write it to `docs/adr/NNNN-kebab-title.md` (create the folder lazily):

  ```markdown
  # NNNN. <Title>

  Status: Accepted · Date: YYYY-MM-DD · Decisions: D-xx

  ## Context
  ## Decision
  ## Alternatives considered
  ## Consequences
  ```

### When the grilling is done

The grilling is done when the frontier is empty: every branch visited and nothing silently assumed. Then post the final ledger plus the proposed feature map table (see template) and ask: "Is this our shared understanding? Anything to change before I write PRD.md?" Wait for a clear yes.

---

## Phase 3: Write PRD.md

Write to `PRD.md` at the repo root unless the developer chose another path. Use the template below. Guidelines:

- **Use the glossary's terms exactly**, capitalized consistently. Don't introduce synonyms.
- **Write requirements in OpenSpec's shape.** Each is a normative sentence with SHALL/MUST and at least one WHEN/THEN scenario. `/opsx:propose` produces spec deltas in this same shape, so matching it means requirements get copied, not reinterpreted.
- **Every requirement traces to decisions** (`Traces: D-03, D-07`). A requirement with no trace is an assumption: either it came up in the grill, or it goes under Deferred questions.
- **Carry exact values.** Numbers, limits, orderings, and negatives from the ledger appear verbatim.
- **Stay at the product level.** Include design constraints only where the developer actually decided them (link the ADR). Leave the rest to OpenSpec's `design.md`.
- **Leave Deferred questions empty** unless the developer explicitly chose to defer something; each deferred item gets an owner and the feature it blocks.

### Change ID and capability naming

- **Change ID**: kebab-case, verb-led (`add-`, `update-`, `remove-`, `refactor-`, `migrate-`), 2–5 words, and unique against `openspec/changes/` and the archive. Example: `add-guest-invite-links`.
- **Capability**: kebab-case noun naming the spec area the change touches (`auth`, `invitations`, `billing`). Reuse an existing `openspec/specs/<capability>/` name when the feature extends it; a new name means a new spec.

### PRD template

````markdown
# PRD: <Product or initiative name>

> Source idea: `docs/idea.md` · Glossary: `GLOSSARY.md` · ADRs: `docs/adr/` · Last updated: YYYY-MM-DD

## 1. Overview

### Problem
<2–4 sentences: who hurts, how, and what they do today.>

### Users
- **<Role>**: <what they need from this>

### Goals and success metrics
| Goal | Metric | Target | Traces |
|------|--------|--------|--------|

### Non-goals
- <Explicitly out of scope, with the decision ID>

## 2. Cross-cutting requirements
- **NFR-01** <The system SHALL …> (Traces: D-xx)

## 3. Feature map

| ID | Feature | OpenSpec change | Capability | Depends on | Priority |
|----|---------|-----------------|------------|------------|----------|
| F-01 | <Name> | `add-…` | `…` | — | P0 |

**Build order:** F-01 → F-02 → (F-03 ∥ F-04)

## 4. Features

### F-01 · <Feature name>

| OpenSpec change | Capability | Depends on | Priority |
|---|---|---|---|
| `add-…` | `…` | — | P0 |

**Propose with:**
```
/opsx:propose add-… Implement F-01 "<Feature name>" from PRD.md. Use its requirements and scenarios as the spec delta for the `…` capability.
```

**Why:** <1–2 sentences of user value.>

**In scope**
- …

**Out of scope**
- …

**Requirements**

- **Requirement: <Short name>**: The system SHALL <behavior>. *(Traces: D-xx)*
  - *Scenario: <name>*: **WHEN** <condition> **THEN** <observable outcome>
  - *Scenario: <edge or error case>*: **WHEN** … **THEN** …

**Decided constraints**
- <Only constraints the developer decided; link ADRs>

**Acceptance criteria**
- [ ] <Checkable statement a reviewer or test can confirm>

<!-- repeat for each feature -->

## 5. Integrations and external dependencies
- <Service>: <what for>, <constraints> (Traces: D-xx)

## 6. Risks and assumptions
| Risk / assumption | Impact | Mitigation | Traces |
|---|---|---|---|

## 7. Deferred questions
| Question | Owner | Blocks | Needed by |
|---|---|---|---|

## Appendix A: Decision log
| ID | Decision | Rationale | Used in |
|----|----------|-----------|---------|
| D-01 | <exact wording from the ledger> | <why> | F-01, NFR-02 |
````

---

## Phase 4: Verify and hand off

### Verify against the ledger

Before telling the developer the PRD is done, re-read it against the decision ledger, not against your memory of it:

1. Every `D-xx` appears in the decision log **and** is used somewhere (a requirement, NFR, non-goal, metric, or constraint). Report any orphan.
2. Every exact value (numbers, units, limits, orderings, "must NOT"s) survives verbatim in the place it's used.
3. Every feature has a change ID, a capability, at least one requirement, and at least one scenario covering an edge or error case.
4. Change IDs are unique and don't collide with `openspec/changes/` or the archive.
5. The dependency order has no cycles, and nothing depends on a later-priority feature.
6. Terms match `GLOSSARY.md`.

Fix what you find, then report in one line: "Verified: 23/23 decisions traced, 6 features, 0 deferred questions."

### Hand off

Close with the build order as a short table of features and their propose commands, so the developer can start with F-01 immediately. Then add:

- **Command spelling.** In Claude Code with OpenSpec's slash commands installed it's `/opsx:propose <change-id> …`. Skill-only installs and some other tools use `/openspec-propose`. If you're unsure which is installed, check `.claude/commands/` or `.claude/skills/`.
- **Optional wiring (ask first).** Offer to add one line to `openspec/config.yaml` under `context:` so every OpenSpec run knows where requirements live:

  ```yaml
  context: |
    Product requirements live in PRD.md. When a change ID matches a feature's "OpenSpec change" in PRD.md, treat that feature's requirements, scenarios, and decided constraints as the source of truth, and use terms exactly as defined in GLOSSARY.md.
  ```

  Only edit `config.yaml` after the developer says yes. If the file has an existing `context`, append the line instead of replacing it.
- **Don't run `/opsx:propose` yourself** unless asked. Choosing when to start each feature is the developer's call.

### Revising later

If invoked again on a repo that already has `PRD.md`, read it and its decision log first, continue numbering from the last `D-xx`, grill only the branches the developer wants to change, and update the affected features in place. If a feature's change already exists under `openspec/changes/`, point out that the PRD change should flow into it via OpenSpec's update-change workflow (`openspec-update-change`) rather than a new proposal.
