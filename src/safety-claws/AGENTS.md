# SAFETYCLAWZ — AGENTS.md

- Repo: https://github.com/chelleboyer/safetyclawz

> **Note — MVP vs. Vision**: This document describes the *full* SafetyClawz integration
> model. The current **prototype (v0.1.0)** implements a subset: exec-tool blocking via
> `before_tool_call` / `after_tool_call` hooks with YAML-driven blocklists. Features such
> as SIMULATE, REQUIRE_APPROVAL, model_confidence scoring, chain_depth tracking, and
> data_classification are planned for Growth/V1 milestones.

## Execution Firewall for OpenClaw Runtimes

This document defines how OpenClaw-based agents must integrate with SafetyClawz.

SafetyClawz is an execution firewall for OpenClaw tool calls.

It governs action execution.
It does not govern reasoning.
It does not modify model outputs.
It does not replace OpenClaw orchestration.

It sits between OpenClaw and the external world.

---

# 1. Scope

SafetyClawz applies specifically to:

OpenClaw agents invoking tools that produce side effects.

This includes:

- External API calls
- Email sending
- Database mutations
- File system writes
- Shell execution
- Credential access
- Financial transactions
- Workflow triggers
- Hardware commands
- Network communication

If an OpenClaw tool produces side effects, it MUST pass through SafetyClawz.

---

# 2. Execution Boundary

OpenClaw handles:

- Planning
- Tool selection
- Reasoning
- Chaining

SafetyClawz handles:

- Risk evaluation
- Policy enforcement
- Execution approval
- Audit logging

OpenClaw decides what to do.
SafetyClawz decides whether it may be done.

---

# 3. Mandatory Integration Model

OpenClaw tool invocation flow MUST be modified as follows:

1. Tool call constructed by OpenClaw
2. Tool call wrapped in ActionRequest
3. ActionRequest submitted to SafetyClawz
4. Decision returned
5. Execution permitted or denied based on decision

Direct execution without evaluation is non-compliant.

---

# 4. ActionRequest Requirements

OpenClaw integrations MUST provide:

- agent_id
- session_id
- tool_name
- tool_arguments
- model_confidence (0–1 float)
- chain_depth
- external_communication flag
- data_classification
- timestamp

Integrations MUST NOT:

- Omit required fields
- Falsify metadata
- Bypass evaluation for “trusted” tools

---

# 5. Decision Handling

SafetyClawz will return one of:

APPROVE  
REQUIRE_APPROVAL  
SIMULATE  
BLOCK  

OpenClaw integration MUST:

APPROVE → Execute tool  
REQUIRE_APPROVAL → Pause execution  
SIMULATE → Do not execute; return predicted outcome  
BLOCK → Do not execute; return explanation  

OpenClaw agents MUST NOT override BLOCK decisions.

---

# 6. High-Risk Tool Categories

By default, the following OpenClaw tool categories are high risk:

- Database mutation tools
- Email tools
- Payment tools
- Shell execution tools
- File write tools
- Credential access tools
- External webhook triggers
- Robot hardware control tools

Policies may override defaults, but evaluation is mandatory.

---

# 7. Audit Logging

For every evaluated OpenClaw tool call, SafetyClawz must record:

- ActionRequest
- RiskAssessment
- Decision
- Receipt (if executed)

Logs must be append-only.

---

# 8. Bypass Prevention

OpenClaw integrations must not:

- Execute tools directly
- Call external systems before evaluation
- Retry blocked actions without new evaluation
- Suppress decision results
- Modify risk scores

SafetyClawz must be the only execution gateway.

---

# 9. Simulation Mode

When SIMULATE is returned:

- Tool must not execute.
- Expected side effects must be described.
- No mutation may occur.

Simulation mode is mandatory for high-risk tool categories.

---

# 10. Physical Actuation Rules (If Applicable)

If OpenClaw controls robotics or hardware:

- All movement commands must pass through SafetyClawz.
- Risk must include physical impact weighting.
- Emergency stop must remain independent of OpenClaw reasoning.
- Execution must never bypass evaluation due to latency concerns.

---

# 11. Compliance Definition

An OpenClaw runtime is SafetyClawz-compliant if:

- No external tool executes without evaluation.
- BLOCK decisions are respected.
- All evaluations are logged.
- Policy enforcement is deterministic.

---

# 12. Future Extensibility

Although designed for OpenClaw, the SafetyClawz architecture may support additional runtimes in the future.

This document defines OpenClaw integration only.

---

# 13. Intent

OpenClaw enables powerful autonomous tool execution.

SafetyClawz ensures that power does not exceed its boundaries.

OpenClaw chooses the action.
SafetyClawz enforces the boundary.

If OpenClaw touches the real world,
it must pass through the firewall.
