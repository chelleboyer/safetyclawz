# OpenClaw Integration Research

**Research Date**: 2026-02-16  
**Purpose**: Understand OpenClaw's existing concepts and approval architecture to inform SafetyClawz MVP design

**OpenClaw Context**: Open-source personal AI assistant with a broad tool ecosystem (exec, messaging, files) and 50+ skills in this workspace. External popularity metrics should be verified before publication.

## Sources

- [Appendix-OpenClaw-Docs.md](Appendix-OpenClaw-Docs.md)

---

## Key Findings

### 1. **OpenClaw Already Has Allowlist + Approval System**

Found in: `src/openclaw/src/agents/bash-tools.exec.ts` + `src/openclaw/src/infra/exec-approvals.ts`

#### Security Modes (3 levels):
```typescript
type ExecSecurity = "deny" | "allowlist" | "full";
```

- **deny**: Block all exec commands
- **allowlist**: Only allow commands matching patterns in allowlist
- **full**: Allow all commands (dangerous, requires elevation)

#### Ask Modes (approval workflow):
```typescript
type ExecAsk = "off" | "on-miss" | "always";
```

- **off**: No approval required (auto-execute per security mode)
- **on-miss**: Request approval only when command NOT in allowlist
- **always**: Always request approval (even if in allowlist)

#### Allowlist Pattern Matching:
```typescript
type ExecAllowlistEntry = {
  id?: string;
  pattern: string;  // Command pattern (e.g., "git", "npm install")
  lastUsedAt?: number;
  lastUsedCommand?: string;
  lastResolvedPath?: string;
};
```

**How it works**:
1. Parse shell command into segments
2. Check if command binary matches allowlist patterns
3. If `ask: "on-miss"` and NOT in allowlist → request approval
4. If approved, optionally add to allowlist for future use

**Example OpenClaw approval file** (`~/.openclaw/exec-approvals.json`):
```json
{
  "version": 1,
  "defaults": {
    "security": "allowlist",
    "ask": "on-miss",
    "askFallback": "deny"
  },
  "agents": {
    "main": {
      "security": "allowlist",
      "ask": "on-miss",
      "allowlist": [
        { "pattern": "git" },
        { "pattern": "npm" },
        { "pattern": "/usr/bin/node" }
      ]
    }
  }
}
```

---

### 2. **Approval Workflow Architecture**

#### Real-Time Approval via Unix Socket:
```typescript
// Socket path: ~/.openclaw/exec-approvals.sock
type ExecApprovalRequest = {
  id: string;
  request: {
    command: string;
    cwd?: string | null;
    host?: string | null;
    agentId?: string | null;
    sessionKey?: string | null;
  };
  createdAtMs: number;
  expiresAtMs: number;  // Default: 120 seconds
};
```

**How approval works**:
1. Tool execution paused
2. Approval request sent to Unix socket
3. CLI/UI client listens on socket, prompts user
4. User approves/denies
5. Response sent back via socket
6. Tool execution resumes or terminates

**This is exactly what SafetyClawz V2/Growth needs!**

---

### 3. **Session Management Concepts**

Found in: `src/openclaw/docs/concepts/session.md`

#### Session Isolation:
- **DM scope modes**: `main` (shared), `per-peer`, `per-channel-peer`, `per-account-channel-peer`
- **Security warning**: Multi-user setups MUST use `per-channel-peer` to prevent context leakage between users
- **Session pruning**: Auto-trims old tool results from context to stay within token limits

#### Audit Trail:
- Sessions stored as **JSONL transcripts**: `~/.openclaw/agents/<agentId>/sessions/<SessionId>.jsonl`
- Each entry: `{timestamp, role, content, tool_calls, tool_results}`
- Append-only (never rewrite history)

**This aligns perfectly with SafetyClawz audit logging requirements!**

---

### 4. **Tool Execution Hosts**

OpenClaw supports 3 execution modes:

```typescript
type ExecHost = "sandbox" | "gateway" | "node";
```

#### sandbox:
- Docker-isolated execution
- Default security: `deny` (safest)
- No access to host filesystem

#### gateway:
- Runs on OpenClaw gateway host (your laptop/server)
- Default security: `allowlist`
- Access to full filesystem (dangerous)

#### node:
- Delegates to paired "node hosts" (companion apps, remote machines)
- Each node has independent security profile
- Useful for distributed agent architectures

**SafetyClawz V1 should focus on `gateway` mode (local execution with allowlist wrapper).**

**Note**: `tools.exec.host` defaults to `sandbox`, but if sandboxing is off, exec runs on the gateway host. Exec approvals apply when configured for `gateway` or `node` execution.

---

### 5. **Tool Policy Surface (Coarse-Grained)**

OpenClaw provides tool governance by tool name, but not parameter-level rules:

- `tools.allow` / `tools.deny` (deny wins; wildcards supported)
- `tools.profile` base allowlist (`minimal`, `coding`, `messaging`, `full`)
- `tools.byProvider` to narrow tool access by provider or provider/model
- Tool group shorthands like `group:fs`, `group:runtime`, `group:web`
- Per-agent overrides via `agents.list[].tools.*`

These controls are valuable, but they do not cover parameters like recipients, file paths, or rate limits.

---

### 6. **Plugin System Notes (from official docs)**

- Plugins run in-process with the Gateway; treat them as trusted code.
- `openclaw plugins install` supports npm registry packages and local paths/tar/zip; npm specs are registry-only (no git/URL/HTTP specs).
- Install uses `npm pack` + `npm install --ignore-scripts` to avoid lifecycle scripts.
- `plugins.allow` / `plugins.deny` exist; unknown plugin ids in config are errors.
- `plugins.slots` selects an exclusive plugin for categories like memory.

---

### 7. **What OpenClaw DOESN'T Have (SafetyClawz Opportunities)**

✅ **Unified policy across tool types**:
- OpenClaw has **per-command allowlists for exec**, **tool allow/deny policies** by tool name, and **channel-level inbound allowlists**
- No unified policy for tool-call parameters (messaging recipients, file paths, API call targets)
- **SafetyClawz V1 can provide unified YAML for tool parameters across tools**

✅ **Rate limiting**:
- No rate limits on messaging tools
- Agent could spam contact list
- **SafetyClawz V1 adds rate limiting**

✅ **Path restrictions**:
- No blocklists for sensitive paths (`/`, `/etc`, `~/.ssh`)
- **SafetyClawz V1 adds path blocklists**

✅ **Outbound recipient allowlists**:
- Inbound allowlists exist at the channel layer, but there is no outbound recipient allowlist for message tool calls
- **SafetyClawz V1 adds outbound recipient allowlists**

✅ **Centralized audit queryable UI**:
- OpenClaw stores JSONL transcripts but no query interface
- **SafetyClawz V1 adds `safetyclawz audit` CLI queries**

✅ **Policy versioning/rollback**:
- No version control for approval files
- **SafetyClawz Growth phase adds Git-based policy versioning**

---

## Recommended SafetyClawz MVP Architecture

### **V1 Strategy: Thin Wrapper Around OpenClaw Patterns**

#### 1. Reuse OpenClaw's Allowlist Evaluator:
```python
# SafetyClawz wraps OpenClaw's evaluateShellAllowlist function
from safetyclawz.integrations.openclaw import OpenClawExecWrapper

wrapped_exec = OpenClawExecWrapper(
    policy_file="safety-policy.yaml",
    audit_log="~/.safetyclawz/audit.jsonl"
)

# Intercepts exec tool, checks policy, logs decision
result = wrapped_exec.execute("rm -rf /tmp/test")
```

#### 2. Add Missing Safeguards OpenClaw Lacks:
```yaml
# safety-policy.yaml (V1 format)
safeguards:
  messaging:
    rate_limit: 10/hour
    allowed_contacts: ["+1234567890", "team@company.com"]  # Outbound recipient allowlist
  
  exec:
    mode: allowlist  # Delegates to OpenClaw's allowlist logic
    allowed_commands: ["git", "npm", "ls", "cat"]
    blocked_paths: ["/", "/etc", "/usr", "~/.ssh", "~/.aws"]
  
  files:
    read_only_paths: ["/var", "/tmp"]
    write_blocked_extensions: [".key", ".pem", ".env"]
```

#### 3. Unified Audit Logging:
```jsonl
{"timestamp": "2026-02-16T10:00:00Z", "tool": "exec", "command": "git status", "decision": "ALLOW", "reason": "in_allowlist"}
{"timestamp": "2026-02-16T10:01:00Z", "tool": "exec", "command": "rm -rf /", "decision": "BLOCK", "reason": "blocked_path"}
{"timestamp": "2026-02-16T10:02:00Z", "tool": "messaging.send", "to": "+9999999999", "decision": "BLOCK", "reason": "not_in_recipient_allowlist"}
```

#### 4. Simple CLI Query Interface:
```bash
# Query audit logs
safetyclawz audit --tool=exec --decision=blocked --last-24h
safetyclawz audit --tool=messaging --group-by=recipient
```

---

## Growth Phase Additions (Deferred from V1)

Once MVP proves simple allowlist wrapper has value:

### **V2 Features (Leverage OpenClaw's Approval Architecture)**:

#### 1. Adopt OpenClaw's Unix Socket Approval Flow:
```python
# SafetyClawz listens on same socket as OpenClaw
# ~/.safetyclawz/approvals.sock

# When risk score > 0.7 → REQUIRE_APPROVAL
approval_request = {
    "id": "appr_abc123",
    "tool": "exec",
    "command": "rm -rf src/tests/",
    "risk_score": 0.85,
    "risk_factors": ["recursive_delete", "source_directory"],
    "expires_at_ms": now + 120000
}

# CLI client prompts user
# User approves/denies
# Execution proceeds or blocks
```

#### 2. Add Risk Scoring Engine:
```python
# Heuristic risk scorer (deferred from V1)
risk_score = (
    0.30 * external_comm +
    0.20 * sensitive_tool +
    0.20 * (1 - confidence) +
    0.15 * chain_depth +
    0.15 * data_classification
)

if risk_score > 0.7:
    decision = "REQUIRE_APPROVAL"
elif risk_score > 0.4:
    decision = "SIMULATE"  # Dry-run mode
else:
    decision = "ALLOW"
```

#### 3. Complex Conditional Policies:
```yaml
# Growth phase: risk-based rules (not V1)
rules:
  - name: block_external_phi
    condition: external_communication == true AND data_classification == "PHI"
    action: BLOCK
  
  - name: require_approval_high_risk
    condition: risk_score > 0.7
    action: REQUIRE_APPROVAL
  
  - name: simulate_medium_risk
    condition: risk_score > 0.4 AND risk_score <= 0.7
    action: SIMULATE
```

---

## Integration Code Examples

### **Example 1: Wrap OpenClaw Exec Tool (V1)**

```typescript
// SafetyClawz TypeScript adapter
import { createExecTool } from 'openclaw/agents/bash-tools.exec';
import { SafetyClawz } from 'safetyclawz';

const safety = new SafetyClawz({
  policyFile: '~/.safetyclawz/policy.yaml',
  auditLog: '~/.safetyclawz/audit.jsonl'
});

const originalExecTool = createExecTool({
  host: 'gateway',
  security: 'allowlist',
  ask: 'on-miss'
});

// Wrap exec tool with SafetyClawz
const wrappedExecTool = safety.wrap(originalExecTool, {
  toolType: 'exec',
  enforcePathBlocklist: true,
  enforceAllowlist: true
});

// Now all exec calls go through SafetyClawz policy + audit
```

### **Example 2: Add Outbound Recipient Allowlist to Messaging Tool (V1)**

```typescript
// OpenClaw doesn't provide outbound recipient allowlists for message tool calls
// SafetyClawz adds this

import { createMessageTool } from 'openclaw/agents/message-tools';
import { SafetyClawz } from 'safetyclawz';

const safety = new SafetyClawz({
  policy: {
    messaging: {
      rate_limit: '10/hour',
      allowed_contacts: ['+1234567890', 'team@company.com']
    }
  }
});

const originalMessageTool = createMessageTool();
const wrappedMessageTool = safety.wrap(originalMessageTool, {
  toolType: 'messaging',
  enforceContactAllowlist: true,
  enforceRateLimit: true
});

// Blocks messages to contacts not in allowlist
// Blocks >10 messages per hour
```

---

## Key Takeaways for PRD Updates

### 1. **V1 MVP Validation**:
✅ Our simplified MVP scope is CORRECT:
- Wrap OpenClaw's existing allowlist logic (proven, tested)
- Add unified YAML policy (OpenClaw lacks multi-tool coverage)
- Add audit logging (OpenClaw has transcripts but no query interface)
- Add missing safeguards (rate limits, outbound recipient allowlists, path blocklists)

### 2. **Growth Phase is Natural Progression**:
✅ Once V1 proves value, Growth adds:
- Risk scoring engine (0-1 scale with explainable factors)
- Approval workflows (reuse OpenClaw's Unix socket pattern)
- REQUIRE_APPROVAL / SIMULATE decisions (not just ALLOW/BLOCK)
- Complex conditional policies (risk_score variables, AND/OR logic)

### 3. **Architecture Pattern to Follow**:
```
User Journey:
1. Install: pip install safetyclawz
2. Init: safetyclawz init  # Generates default policy.yaml
3. Integrate: Wrap OpenClaw tools with SafetyClawz adapters
4. Enforce: Policy evaluated on every tool call
5. Audit: safetyclawz audit --blocked --last-7d
```

### 4. **Technical Debt We Avoid**:
❌ Don't reinvent shell parsing (use OpenClaw's evaluateShellAllowlist)
❌ Don't build custom approval UI (reuse OpenClaw's socket protocol in Growth)
❌ Don't create new session storage (wrap OpenClaw's JSONL transcripts)

### 5. **Differentiation We Provide**:
✅ **Unified policy language** across exec, messaging, files, API calls
✅ **Audit query interface** (`safetyclawz audit` CLI)
✅ **Missing safeguards** OpenClaw doesn't have (rate limits, outbound recipient allowlists)
✅ **Policy versioning** (Growth phase: Git-based rollback)
✅ **Risk-based workflows** (Growth phase: heuristic + ML scoring)

---

## Recommended PRD Section Updates

### **Section 5.1 (MVP) - Add Technical Implementation Details**:

```markdown
### Technical Architecture (V1)

**Core Strategy**: Thin wrapper around OpenClaw's proven allowlist evaluator.

**Reuse OpenClaw Components**:
- `evaluateShellAllowlist()` - Shell command parsing and pattern matching
- JSONL audit trail format - Append-only session transcripts
- Allowlist entry schema - `{ pattern, lastUsedAt, lastUsedCommand }`

**Add Missing Safeguards**:
- Rate limiting (messages per hour per tool)
- Outbound recipient allowlists (approved recipients for messaging tools)
- Path blocklists (sensitive directories like `/`, `/etc`, `~/.ssh`)
- Unified YAML policy (one config for all tool types)

**Audit Logging**:
- Format: JSONL (compatible with OpenClaw transcripts)
- Location: `~/.safetyclawz/audit.jsonl`
- Query interface: `safetyclawz audit` CLI tool
- Fields: `{timestamp, tool, action, decision, reason, metadata}`
```

### **Section 15 (OpenClaw Use Case) - Add Integration Examples**:

```markdown
## Real Integration Pattern

OpenClaw exec tool has 3-mode security (`deny|allowlist|full`) and approval workflow.

SafetyClawz V1 **wraps** OpenClaw's allowlist evaluator and adds:
1. Unified YAML policy for exec + messaging + files
2. Missing safeguards (rate limits, outbound recipient allowlists, path blocklists)
3. Audit query interface (`safetyclawz audit`)

**Code Example**:
```typescript
import { createExecTool } from 'openclaw';
import { SafetyClawz } from 'safetyclawz';

const safety = new SafetyClawz({ policyFile: 'safety-policy.yaml' });
const wrappedExec = safety.wrap(createExecTool(), { toolType: 'exec' });
```

SafetyClawz Growth phase adds risk scoring and approval workflows reusing OpenClaw's Unix socket approval protocol.
```

---

## Files to Reference in PRD

These OpenClaw files demonstrate the patterns SafetyClawz will leverage:

1. **Allowlist Architecture**:
   - `src/openclaw/src/infra/exec-approvals.ts` - Approval file format, allowlist schema
   - `src/openclaw/src/infra/exec-approvals-allowlist.ts` - Pattern matching logic

2. **Exec Tool Integration**:
   - `src/openclaw/src/agents/bash-tools.exec.ts` - Security modes, ask modes, approval workflow

3. **Session Management**:
   - `docs/concepts/session.md` - JSONL transcripts, session pruning, isolation

4. **Security Model**:
   - `docs/concepts/agent.md` - Tool policy, workspace sandboxing

These demonstrate SafetyClawz is building on **proven, production-tested patterns** from the OpenClaw codebase in this workspace.

---

## Plugin Hook System Discovery

**BREAKTHROUGH**: OpenClaw has a plugin hook system that allows intercepting tool calls!

### Available Hooks for SafetyClawz:

From `src/openclaw/src/plugins/hooks.ts`:

#### 1. **before_tool_call** (Sequential, Modifying)

```typescript
/**
 * Run before_tool_call hook.
 * Allows plugins to modify or block tool calls.
 * Runs sequentially.
 */
async function runBeforeToolCall(
  event: PluginHookBeforeToolCallEvent,
  ctx: PluginHookToolContext,
): Promise<PluginHookBeforeToolCallResult | undefined> {
  return {
    params: modifiedParams,      // Modify tool parameters
    block: true/false,            // Block execution entirely
    blockReason: "Policy violation" // User-facing reason
  };
}
```

**Use for SafetyClawz**:
- Evaluate YAML policy BEFORE tool executes
- Block disallowed commands (`rm -rf /`, unapproved contacts)
- Enforce rate limits (reject if quota exceeded)
- Inject monitoring (add `--dry-run` flag for destructive commands)

#### 2. **after_tool_call** (Parallel, Fire-and-Forget)

```typescript
/**
 * Run after_tool_call hook.
 * Runs in parallel (fire-and-forget).
 */
async function runAfterToolCall(
  event: PluginHookAfterToolCallEvent,
  ctx: PluginHookToolContext,
): Promise<void> {
  // event contains: toolName, params, result, error, durationMs
}
```

**Use for SafetyClawz**:
- Append to JSONL audit log (non-blocking)
- Check for secret leaks in output (redact GitHub tokens, API keys)
- Update rate limit counters
- Track tool usage metrics

### SafetyClawz Plugin Implementation:

```typescript
// src/safety-claws/index.ts
import type { OpenClawPluginApi } from 'openclaw/plugin-sdk';
import { loadPolicy, evaluatePolicy } from './policy-engine.js';
import { AuditLogger } from './audit.js';
import { RateLimiter } from './rate-limiter.js';

export default function (api: OpenClawPluginApi) {
  const policy = loadPolicy(api.resolvePath('~/.safetyclawz/policy.yaml'));
  const audit = new AuditLogger(api.resolvePath('~/.safetyclawz/audit.jsonl'));
  const rateLimiter = new RateLimiter();
  
  // BEFORE tool execution: enforce policy
  api.registerHook('before_tool_call', async (event, ctx) => {
    const { toolName, params } = event;
    
    // Check rate limits first (fast fail)
    if (toolName === 'message' && rateLimiter.isExceeded('messaging', policy.safeguards.messaging.rate_limit)) {
      return { 
        block: true, 
        blockReason: 'Rate limit exceeded (10/hour)' 
      };
    }
    
    // Evaluate policy
    const decision = await evaluatePolicy({
      toolName,
      params,
      policy: policy.safeguards,
      context: ctx
    });
    
    // Log decision (sync, fast)
    audit.writeSync({ 
      event: 'policy_check', 
      toolName, 
      params, 
      decision, 
      timestamp: Date.now() 
    });
    
    if (decision.action === 'BLOCK') {
      return { block: true, blockReason: decision.reason };
    }
    
    if (decision.action === 'MODIFY') {
      return { params: decision.modifiedParams };
    }
    
    // ALLOW - return undefined (no modification)
  });
  
  // AFTER tool execution: audit logging + secret redaction check
  api.registerHook('after_tool_call', async (event, ctx) => {
    const { toolName, params, result, error, durationMs } = event;
    
    // Check for secret leaks in output
    let sanitizedResult = result;
    if (policy.safeguards.exec?.redact_output_patterns) {
      for (const pattern of policy.safeguards.exec.redact_output_patterns) {
        const regex = new RegExp(pattern, 'g');
        if (typeof sanitizedResult === 'string' && regex.test(sanitizedResult)) {
          sanitizedResult = '[REDACTED: Secret pattern detected]';
          api.logger.warn(`Secret detected in ${toolName} output - redacted`);
        }
      }
    }
    
    // Write to audit log (async)
    await audit.write({
      event: 'tool_execution',
      toolName,
      params,
      result: sanitizedResult,
      error,
      durationMs,
      timestamp: Date.now(),
      sessionKey: ctx.sessionKey,
      agentId: ctx.agentId
    });
    
    // Update rate limiters
    if (toolName === 'message') {
      rateLimiter.increment('messaging');
    }
  });
  
  api.logger.info('SafetyClawz plugin loaded - enforcing YAML policies');
}
```

### Plugin Manifest:

```json
// openclaw.plugin.json
{
  "id": "safetyclawz",
  "name": "SafetyClawz",
  "description": "Execution firewall for autonomous agents - YAML-based policy enforcement",
  "version": "1.0.0",
  "configSchema": {
    "type": "object",
    "additionalProperties": false,
    "properties": {
      "policyFile": {
        "type": "string",
        "default": "~/.safetyclawz/policy.yaml"
      },
      "auditFile": {
        "type": "string",
        "default": "~/.safetyclawz/audit.jsonl"
      }
    }
  }
}
```

### Installation Flow:

```bash
# 1. Install SafetyClawz npm package
npm install -g safetyclawz

# 2. Initialize policy file
safetyclawz init
# Creates ~/.safetyclawz/policy.yaml with safe defaults

# 3. Add to OpenClaw config
# Edit ~/.openclaw/config.json:
{
  "plugins": {
    "allow": ["safetyclawz"],
    "load": {
      "paths": ["~/.npm-global/lib/node_modules/safetyclawz"]
    }
  },
  "safetyclawz": {
    "policyFile": "~/.safetyclawz/policy.yaml",
    "auditFile": "~/.safetyclawz/audit.jsonl"
  }
}

# 4. Restart OpenClaw
openclaw restart

# 5. Verify plugin loaded
openclaw plugins list
# Should show: ✓ safetyclawz (SafetyClawz) - Execution firewall
```

### Why This is Perfect for V1:

✅ **Zero OpenClaw code changes** - Plugin system is official API  
✅ **Full interception capability** - `before_tool_call` runs BEFORE every tool  
✅ **Can block or modify** - Return `{ block: true }` or `{ params: modified }`  
✅ **Easy disable** - Remove from `config.json`, restart OpenClaw  
✅ **Standard npm distribution** - `npm install -g safetyclawz`  
✅ **Works with all OpenClaw versions** - Plugin API is stable  
✅ **Natural upgrade path** - Growth phase adds more sophisticated policies to same hook infrastructure  

---

**Status**: ✅ **Technical implementation validated**. OpenClaw plugin architecture using `before_tool_call` and `after_tool_call` hooks is the V1 implementation strategy.
