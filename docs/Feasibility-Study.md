# SafetyClawz Feasibility Study

**Date**: 2026-02-16
**Scope**: Feasibility based on [docs/PRD.md](docs/PRD.md) and [docs/Architecture-V1.md](docs/Architecture-V1.md)
**Target**: V1 MVP (Months 1-6)

## Sources

- [Appendix-OpenClaw-Docs.md](Appendix-OpenClaw-Docs.md)

---

## Executive Summary

SafetyClawz V1 is feasible as an OpenClaw plugin that enforces YAML policy at `before_tool_call` and logs decisions at `after_tool_call`. OpenClaw already exposes the required hooks and has existing exec approvals, tool allow/deny policies, and security knowledge. The feasibility hinges on narrowing V1 to parameter-level policy enforcement (rate limits, outbound recipient allowlists, path rules) and audit logging. The core risks are around policy correctness, log durability, and performance guarantees, which are manageable with a small, focused implementation and test plan.

**Feasibility Verdict**: **High**, provided V1 scope is kept to allow/block + parameter policies and JSONL audit logging, without risk scoring or approval workflows.

---

## Problem-to-Solution Fit

The PRD defines a consistent problem statement and the architecture maps cleanly to OpenClaw's hook model. The key differentiator is not basic blocking (OpenClaw already blocks and has channel allowlists), but a unified, cross-tool parameter policy for tool calls and a per-tool-call audit query surface. This is a valid and feasible gap to address.

---

## Technical Feasibility

### Integration Feasibility (OpenClaw)
- **Hook availability**: OpenClaw `before_tool_call` allows blocking and parameter modification. This is already demonstrated in the prototype.
- **Audit logging**: `after_tool_call` provides tool result context for JSONL audit entries.
- **Policy input**: A single YAML policy can govern multiple tool classes (exec, messaging, files) with deterministic rules.

**Assessment**: Feasible with minimal OpenClaw coupling. The plugin can remain a thin wrapper.

### Policy Engine Feasibility
- **Exec policy**: allowlist + blocklist + blocked paths are straightforward.
- **Messaging policy**: allowlists and rate limits are simple to implement with deterministic matching.
- **File policy**: write-blocked paths and extensions are low-complexity.

**Assessment**: Feasible for V1 with deterministic matching and a small schema.

### Audit Logging Feasibility
- **Format**: JSONL append-only logging is simple and aligns with V1 requirements.
- **Query**: CLI filters and tailing can be implemented with predictable performance for local files.

**Assessment**: Feasible with a small Node-based CLI and minimal dependencies.

### Performance Feasibility
- Policy evaluation is O(n) over small rule lists and should fit P95 targets if rules are limited and cached.
- File-based audit logging with append-only writes is practical, but fsync costs must be measured.

**Assessment**: Feasible with modest constraints (small policies, buffered writes, and lightweight matching).

---

## Scope Alignment and Feasibility Constraints

**Feasible V1** (aligned with PRD MVP and Architecture):
- ALLOW/BLOCK decision model
- YAML policy with exec + messaging + files safeguards
- Rate limits per tool category
- JSONL audit logs + CLI query

**Not feasible without scope creep**:
- Risk scoring engine
- Approval workflows
- Multi-runtime distributed middleware mode
- Enterprise compliance exports

---

## Key Risks and Mitigations

1. **Policy misconfiguration risk**
   - **Risk**: Users may block too aggressively or allow unsafe paths.
   - **Mitigation**: Provide a minimal safe default policy and a validator that flags dangerous omissions.

2. **Audit log durability vs latency**
   - **Risk**: fsync on every write adds latency; skipping fsync risks data loss.
   - **Mitigation**: Allow configurable durability mode (sync in critical environments, buffered for dev).

3. **Parameter matching correctness**
   - **Risk**: Naive matching (substring) can produce false positives or bypasses.
   - **Mitigation**: Use anchored patterns and normalized tool params; add unit tests for edge cases.

4. **OpenClaw version drift**
   - **Risk**: Hook interfaces or tool params can change over time.
   - **Mitigation**: Keep integration minimal, add adapter tests against the OpenClaw workspace, and pin to compatible versions for initial release.

---

## MVP Build Plan (Feasible Path)

**Phase 1 (Weeks 1-2)**
- Policy schema + loader + validator
- Exec allowlist/blocklist + blocked paths
- Basic audit JSONL writer

**Phase 2 (Weeks 3-4)**
- Messaging allowlists + rate limiter
- File write protections
- CLI audit query tool (tail, last, filter)

**Phase 3 (Weeks 5-6)**
- Hardening: redaction patterns, error handling, fail-closed defaults
- Unit + integration tests
- Documentation and examples

---

## Feasibility Gaps to Resolve

None identified in the current PRD and Architecture snapshot. Keep PRD and Architecture in sync when changing scope or error handling.

---

## Recommendation

Proceed with V1 as a thin OpenClaw plugin focused on parameter-level policy enforcement and JSONL audit logging. Defer risk scoring, approval workflows, and distributed middleware mode until after the MVP validates adoption and performance.

**Overall Feasibility**: **High** with disciplined scope and careful consistency between PRD and Architecture.
