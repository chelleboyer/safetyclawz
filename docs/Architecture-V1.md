# SafetyClawz V1 Technical Architecture

**Version**: 1.0.0-alpha  
**Date**: 2026-02-16  
**Status**: Draft  
**Scope**: MVP (Months 1-6)

## Sources

- [Appendix-OpenClaw-Docs.md](Appendix-OpenClaw-Docs.md)

---

## 1. System Overview

SafetyClawz V1 is an **OpenClaw plugin** that enforces YAML-based policies on agent tool calls using the `before_tool_call` and `after_tool_call` hook system.

**Security Framework**: SafetyClawz aligns with **MITRE ATLAS** (Adversarial Threat Landscape for Artificial-Intelligence Systems), the industry-standard knowledge base for AI/ML security. It adds runtime enforcement to OpenClaw's **Trust Boundary 3 (Tool Execution)**, closing the gap between detection and prevention.

### 1.1 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ OpenClaw Agent Runtime                                      │
│                                                             │
│  Agent invokes tool ──────────────────┐                     │
│                                       │                     │
│                                       ▼                     │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ OpenClaw Plugin System (Hook Runner)                 │   │
│  │                                                      │   │
│  │  before_tool_call hooks:                             │   │
│  │    1. SafetyClawz Plugin ◄──── intercepts here       │   │
│  │    2. Other plugins...                               │   │
│  │                                                      │   │
│  │  Original Tool Execution (if not blocked)            │   │
│  │                                                      │   │
│  │  after_tool_call hooks:                              │   │
│  │    1. SafetyClawz Plugin ◄──── logs here             │   │
│  │    2. Other plugins...                               │   │
│  └──────────────────────────────────────────────────────┘   │
│                         │                                   │
│                         ▼                                   │
│  Tool Result ────────> Agent                                │
└─────────────────────────────────────────────────────────────┘
                          │
                          │
        ┌─────────────────┴──────────────────┐
        │                                    │
        ▼                                    ▼
┌───────────────────┐              ┌─────────────────────┐
│ SafetyClawz       │              │ SafetyClawz         │
│ Policy Engine     │              │ Audit Logger        │
│                   │              │                     │
│ • YAML Parser     │              │ • JSONL Writer      │
│ • Allowlist Check │              │ • File Rotation     │
│ • Blocklist Check │              │ • Query Interface   │
│ • Rate Limiter    │              │                     │
│                   │              │                     │
│ Returns:          │              │ Writes:             │
│ ALLOW/BLOCK       │              │ ~/.safetyclawz/     │
│ + reason          │              │   audit.jsonl       │
└───────────────────┘              └─────────────────────┘
        ▲                                    
        │                                    
        │                                    
┌───────────────────┐
│ Policy File       │
│                   │
│ ~/.safetyclawz/   │
│   policy.yaml     │
└───────────────────┘
```

### 1.2 MITRE ATLAS Integration

OpenClaw's security architecture follows **MITRE ATLAS** (documented in `src/openclaw/docs/security/THREAT-MODEL-ATLAS.md`), which defines 5 trust boundaries:

1. **Channel Access** - Device pairing, authentication, allowlists
2. **Session Isolation** - Session keys, tool policies, audit logging
3. **Tool Execution** - Sandboxing, exec-approvals, SSRF protection
4. **External Content** - Content wrapping, security notices
5. **Supply Chain** - Skill publishing, moderation

**SafetyClawz's Role**: Adds **runtime policy enforcement** to Trust Boundary 3 (Tool Execution).

| Attack Vector (MITRE ATLAS) | OpenClaw Defense | SafetyClawz Enhancement |
|----------------------------|------------------|-------------------------|
| **Prompt Injection → RCE** | Detection via `external-content.ts` | **Block** dangerous exec patterns |
| **Credential Theft** | Audit logging | **Redact** secrets from logs |
| **Data Exfiltration** | Skill scanner flags suspicious network | **Rate limit** API calls |
| **Lateral Movement** | Session isolation | **Outbound recipient allowlists** for messaging |
| **Privilege Escalation** | Exec allowlist approval | **Block** sudo/elevated commands |

**Key Insight**: OpenClaw has strong security knowledge and existing enforcement hooks, plus coarse tool governance (profiles, allow/deny lists, provider-specific narrowing) and channel-level inbound allowlists, but lacks a unified, cross-tool policy layer for tool-call parameters. SafetyClawz adds that enforcement and audit surface.

**Reference**: See [OpenClaw-Security-Analysis.md](./OpenClaw-Security-Analysis.md) for detailed MITRE ATLAS alignment.

---

## 2. Component Design

### 2.1 Plugin Entry Point

**File**: `src/index.ts`

```typescript
import type { OpenClawPluginApi } from 'openclaw/plugin-sdk';
import { PolicyEngine } from './policy-engine.js';
import { AuditLogger } from './audit-logger.js';
import { RateLimiter } from './rate-limiter.js';
import { loadPolicyFile } from './policy-loader.js';

export default function SafetyClawzPlugin(api: OpenClawPluginApi) {
  // Load policy file (validate on startup)
  const policyPath = api.pluginConfig?.policyFile || '~/.safetyclawz/policy.yaml';
  const policy = loadPolicyFile(api.resolvePath(policyPath));
  
  if (!policy) {
    api.logger.error('SafetyClawz: Failed to load policy file, plugin disabled');
    return;
  }
  
  const policyEngine = new PolicyEngine(policy);
  const auditLogger = new AuditLogger(api.resolvePath('~/.safetyclawz/audit.jsonl'));
  const rateLimiter = new RateLimiter();
  
  // Hook 1: Enforce policy BEFORE tool execution
  api.registerHook('before_tool_call', async (event, ctx) => {
    const { toolName, params } = event;
    const startTime = Date.now();
    
    try {
      // Check rate limits first (fast fail)
      if (rateLimiter.isExceeded(toolName, policy.safeguards)) {
        const decision = {
          decision: 'BLOCK',
          reason: `Rate limit exceeded for ${toolName}`,
          triggered_rule: `safeguards.${toolName}.rate_limit`,
        };
        
        auditLogger.writeSync({ event: 'policy_check', toolName, params, decision, timestamp: Date.now() });
        return { block: true, blockReason: decision.reason };
      }
      
      // Evaluate policy
      const decision = await policyEngine.evaluate({ toolName, params, context: ctx });
      
      // Log decision
      auditLogger.writeSync({
        event: 'policy_check',
        toolName,
        params,
        decision,
        timestamp: Date.now(),
        durationMs: Date.now() - startTime,
      });
      
      if (decision.decision === 'BLOCK') {
        return { block: true, blockReason: decision.reason };
      }
      
      // ALLOW - increment rate limiter
      rateLimiter.increment(toolName);
      
    } catch (err) {
      api.logger.error(`SafetyClawz policy evaluation failed: ${err}`);
      // Fail-closed: block on errors
      return { block: true, blockReason: 'Policy evaluation error (fail-closed)' };
    }
  });
  
  // Hook 2: Audit log AFTER tool execution
  api.registerHook('after_tool_call', async (event, ctx) => {
    const { toolName, params, result, error, durationMs } = event;
    
    await auditLogger.write({
      event: 'tool_execution',
      toolName,
      params,
      result: sanitizeResult(result, policy.safeguards),
      error,
      durationMs,
      timestamp: Date.now(),
      sessionKey: ctx.sessionKey,
      agentId: ctx.agentId,
    });
  });
  
  api.logger.info('SafetyClawz: Policy enforcement enabled');
}

// Helper: Redact secrets from results
function sanitizeResult(result: any, safeguards: any): any {
  if (typeof result !== 'string') return result;
  
  const redactPatterns = safeguards.exec?.redact_output_patterns || [];
  let sanitized = result;
  
  for (const pattern of redactPatterns) {
    const regex = new RegExp(pattern, 'g');
    if (regex.test(sanitized)) {
      sanitized = '[REDACTED: Secret pattern detected]';
      break;
    }
  }
  
  return sanitized;
}
```

---

### 2.2 Policy Engine

**File**: `src/policy-engine.ts`

```typescript
import type { PolicyConfig, ToolEvaluationContext, PolicyDecision } from './types.js';

export class PolicyEngine {
  constructor(private policy: PolicyConfig) {}
  
  async evaluate(context: ToolEvaluationContext): Promise<PolicyDecision> {
    const { toolName, params } = context;
    
    // Route to appropriate evaluator based on tool type
    if (toolName === 'exec' || toolName.startsWith('exec')) {
      return this.evaluateExec(params, context);
    }
    
    if (toolName === 'message' || toolName.includes('message')) {
      return this.evaluateMessaging(params, context);
    }
    
    if (toolName === 'read' || toolName === 'write' || toolName.includes('file')) {
      return this.evaluateFile(params, context);
    }
    
    // Default: ALLOW (no policy defined)
    return {
      decision: 'ALLOW',
      reason: 'No policy rule matches this tool',
      triggered_rule: null,
    };
  }
  
  private evaluateExec(params: any, context: ToolEvaluationContext): PolicyDecision {
    const execPolicy = this.policy.safeguards?.exec;
    if (!execPolicy) return { decision: 'ALLOW', reason: 'No exec policy defined', triggered_rule: null };
    
    const command = params.command || params.cmd || '';
    
    // Check blocked commands first
    if (execPolicy.blocked_commands) {
      for (const pattern of execPolicy.blocked_commands) {
        const regex = new RegExp(pattern, 'i');
        if (regex.test(command)) {
          return {
            decision: 'BLOCK',
            reason: `Command matches blocked pattern: ${pattern}`,
            triggered_rule: 'exec.blocked_commands',
          };
        }
      }
    }
    
    // Check allowlist (if mode is allowlist)
    if (execPolicy.mode === 'allowlist' && execPolicy.allowed_commands) {
      const commandBase = command.split(/\s+/)[0]; // Extract binary name
      
      const isAllowed = execPolicy.allowed_commands.some(allowed => {
        // Exact match or pattern match
        if (allowed === commandBase) return true;
        const regex = new RegExp(`^${allowed}$`, 'i');
        return regex.test(commandBase);
      });
      
      if (!isAllowed) {
        return {
          decision: 'BLOCK',
          reason: `Command '${commandBase}' not in allowed_commands`,
          triggered_rule: 'exec.allowed_commands',
        };
      }
    }
    
    // Check blocked paths (for commands touching filesystem)
    if (execPolicy.blocked_paths) {
      for (const blockedPath of execPolicy.blocked_paths) {
        if (command.includes(blockedPath)) {
          return {
            decision: 'BLOCK',
            reason: `Command references blocked path: ${blockedPath}`,
            triggered_rule: 'exec.blocked_paths',
          };
        }
      }
    }
    
    return { decision: 'ALLOW', reason: 'Command passes exec policy', triggered_rule: null };
  }
  
  private evaluateMessaging(params: any, context: ToolEvaluationContext): PolicyDecision {
    const msgPolicy = this.policy.safeguards?.messaging;
    if (!msgPolicy) return { decision: 'ALLOW', reason: 'No messaging policy defined', triggered_rule: null };
    
    const to = params.to || params.recipient || params.channel || '';
    
    // Check outbound recipient allowlist
    if (msgPolicy.allowed_contacts) {
      const isAllowed = msgPolicy.allowed_contacts.some(allowed => 
        to.includes(allowed) || allowed === to
      );
      
      if (!isAllowed) {
        return {
          decision: 'BLOCK',
          reason: `Recipient '${to}' not in allowed_contacts`,
          triggered_rule: 'messaging.allowed_contacts',
        };
      }
    }
    
    // Check channel allowlist
    if (msgPolicy.allowed_channels) {
      const channel = params.channel || '';
      const isAllowed = msgPolicy.allowed_channels.some(allowed => 
        channel.includes(allowed) || allowed === channel
      );
      
      if (!isAllowed) {
        return {
          decision: 'BLOCK',
          reason: `Channel '${channel}' not in allowed_channels`,
          triggered_rule: 'messaging.allowed_channels',
        };
      }
    }
    
    return { decision: 'ALLOW', reason: 'Message passes messaging policy', triggered_rule: null };
  }
  
  private evaluateFile(params: any, context: ToolEvaluationContext): PolicyDecision {
    const filePolicy = this.policy.safeguards?.files;
    if (!filePolicy) return { decision: 'ALLOW', reason: 'No file policy defined', triggered_rule: null };
    
    const path = params.path || params.file || '';
    const isWrite = context.toolName === 'write' || params.mode === 'write';
    
    // Check write-blocked paths
    if (isWrite && filePolicy.write_blocked_paths) {
      for (const blockedPath of filePolicy.write_blocked_paths) {
        if (path.startsWith(blockedPath) || path.includes(blockedPath)) {
          return {
            decision: 'BLOCK',
            reason: `Write to blocked path: ${blockedPath}`,
            triggered_rule: 'files.write_blocked_paths',
          };
        }
      }
    }
    
    // Check write-blocked extensions
    if (isWrite && filePolicy.write_blocked_extensions) {
      for (const ext of filePolicy.write_blocked_extensions) {
        if (path.endsWith(ext)) {
          return {
            decision: 'BLOCK',
            reason: `Write to blocked extension: ${ext}`,
            triggered_rule: 'files.write_blocked_extensions',
          };
        }
      }
    }
    
    return { decision: 'ALLOW', reason: 'File operation passes file policy', triggered_rule: null };
  }
}
```

---

### 2.3 Rate Limiter

**File**: `src/rate-limiter.ts`

```typescript
export class RateLimiter {
  private counters: Map<string, { count: number; windowStart: number }> = new Map();
  
  isExceeded(toolName: string, safeguards: any): boolean {
    const limit = this.getLimit(toolName, safeguards);
    if (!limit) return false; // No rate limit configured
    
    const { maxCount, windowMs } = this.parseLimit(limit);
    const key = `${toolName}:${Math.floor(Date.now() / windowMs)}`;
    
    const counter = this.counters.get(key);
    if (!counter) return false;
    
    return counter.count >= maxCount;
  }
  
  increment(toolName: string): void {
    const windowMs = 3600000; // 1 hour default
    const key = `${toolName}:${Math.floor(Date.now() / windowMs)}`;
    
    const counter = this.counters.get(key) || { count: 0, windowStart: Date.now() };
    counter.count += 1;
    this.counters.set(key, counter);
    
    // Cleanup old windows
    this.cleanup(windowMs);
  }
  
  private getLimit(toolName: string, safeguards: any): string | null {
    if (toolName === 'message' || toolName.includes('message')) {
      return safeguards.messaging?.rate_limit || null;
    }
    return null;
  }
  
  private parseLimit(limit: string): { maxCount: number; windowMs: number } {
    // Parse "10/hour" -> { maxCount: 10, windowMs: 3600000 }
    const match = limit.match(/(\d+)\/(hour|minute|day)/);
    if (!match) return { maxCount: 10, windowMs: 3600000 };
    
    const maxCount = parseInt(match[1], 10);
    const windowMs = match[2] === 'minute' ? 60000 : match[2] === 'hour' ? 3600000 : 86400000;
    
    return { maxCount, windowMs };
  }
  
  private cleanup(windowMs: number): void {
    const now = Date.now();
    for (const [key, counter] of this.counters.entries()) {
      if (now - counter.windowStart > windowMs * 2) {
        this.counters.delete(key);
      }
    }
  }
}
```

---

### 2.4 Audit Logger

**File**: `src/audit-logger.ts`

```typescript
import fs from 'node:fs';
import path from 'node:path';

export class AuditLogger {
  constructor(private logPath: string) {
    this.ensureLogFile();
  }
  
  private ensureLogFile(): void {
    const dir = path.dirname(this.logPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
  
  writeSync(entry: any): void {
    const line = JSON.stringify(entry) + '\n';
    fs.appendFileSync(this.logPath, line, 'utf-8');
  }
  
  async write(entry: any): Promise<void> {
    const line = JSON.stringify(entry) + '\n';
    await fs.promises.appendFile(this.logPath, line, 'utf-8');
  }
  
  query(filter: { since?: number; toolName?: string; decision?: string }): any[] {
    if (!fs.existsSync(this.logPath)) return [];
    
    const lines = fs.readFileSync(this.logPath, 'utf-8').split('\n').filter(Boolean);
    const entries = lines.map(line => JSON.parse(line));
    
    return entries.filter(entry => {
      if (filter.since && entry.timestamp < filter.since) return false;
      if (filter.toolName && entry.toolName !== filter.toolName) return false;
      if (filter.decision && entry.decision?.decision !== filter.decision) return false;
      return true;
    });
  }
}
```

---

### 2.5 Types

**File**: `src/types.ts`

```typescript
export interface PolicyConfig {
  safeguards: {
    messaging?: {
      rate_limit?: string;
      allowed_contacts?: string[];
      allowed_channels?: string[];
    };
    exec?: {
      mode?: 'allowlist' | 'deny' | 'full';
      allowed_commands?: string[];
      blocked_commands?: string[];
      blocked_paths?: string[];
      redact_output_patterns?: string[];
    };
    files?: {
      read_only_paths?: string[];
      write_blocked_paths?: string[];
      write_blocked_extensions?: string[];
    };
  };
}

export interface ToolEvaluationContext {
  toolName: string;
  params: any;
  context?: {
    agentId?: string;
    sessionKey?: string;
  };
}

export interface PolicyDecision {
  decision: 'ALLOW' | 'BLOCK';
  reason: string;
  triggered_rule: string | null;
}
```

---

## 3. Plugin Manifest

**File**: `openclaw.plugin.json`

```json
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
        "default": "~/.safetyclawz/policy.yaml",
        "description": "Path to YAML policy file"
      },
      "auditFile": {
        "type": "string",
        "default": "~/.safetyclawz/audit.jsonl",
        "description": "Path to JSONL audit log"
      },
      "failClosed": {
        "type": "boolean",
        "default": true,
        "description": "Block actions when policy evaluation fails"
      }
    }
  },
  "uiHints": {
    "policyFile": {
      "label": "Policy File Path",
      "help": "YAML file defining safeguards"
    },
    "auditFile": {
      "label": "Audit Log Path",
      "help": "Append-only JSONL audit trail"
    },
    "failClosed": {
      "label": "Fail Closed",
      "help": "Block actions when errors occur (recommended: true)"
    }
  }
}
```

---

## 4. Default Policy File

**File**: `policy-defaults.yaml`

**Baseline**: Defaults are derived from:
- **OpenClaw's dangerous-tools.ts** - Production-validated high-risk tools list
- **OpenClaw's skill-scanner.ts** - 7 malicious code detection patterns
- **MITRE ATLAS threat model** - AI-specific attack vectors
- **90+ user feedback sessions** - Real-world agent safety incidents

```yaml
# SafetyClawz Default Policy
# Generated by: safetyclawz init
# Based on OpenClaw security knowledge (src/security/dangerous-tools.ts, skill-scanner.ts)
# Aligned with MITRE ATLAS threat model (src/openclaw/docs/security/THREAT-MODEL-ATLAS.md)
# Documentation: https://docs.safetyclawz.io/policy-reference

safeguards:
  # Messaging tools (imsg, discord, slack, etc.)
  messaging:
    rate_limit: 10/hour
    allowed_contacts:
      - "+14155551212"  # Your phone number
      - "team@company.com"  # Your team email
    allowed_channels:
      - "discord:123456"  # Your Discord server
      - "slack:C01ABC"    # Your Slack channel
  
  # Exec tool (shell commands)
  exec:
    mode: allowlist  # Options: allowlist | deny | full
    allowed_commands:
      - git
      - npm
      - pnpm
      - node
      - ls
      - cat
      - grep
      - find
      - echo
    blocked_commands:
      - "rm -rf /"
      - "sudo.*"
      - "curl.*\\|.*sh"
      - "wget.*\\|.*sh"
    blocked_paths:
      - "/"
      - "/etc"
      - "/usr"
      - "/bin"
      - "/sbin"
      - "~/.ssh"
      - "~/.aws"
      - "~/.config"
    redact_output_patterns:
      - "ghp_[a-zA-Z0-9]{36}"   # GitHub tokens
      - "sk-[a-zA-Z0-9]{48}"    # OpenAI keys
      - "op://.*"               # 1Password secret references
  
  # File operations (read/write)
  files:
    read_only_paths:
      - "/var"
      - "/tmp"
      - "/Applications"
    write_blocked_paths:
      - "~/.ssh"
      - "~/.aws"
      - "/etc"
      - "/usr"
    write_blocked_extensions:
      - ".key"
      - ".pem"
      - ".env"
      - ".secret"
```

---

## 5. Installation Flow

### 5.1 User Installation Steps

```bash
# 1. Install SafetyClawz npm package
npm install -g safetyclawz

# 2. Initialize policy file
safetyclawz init
# Creates ~/.safetyclawz/policy.yaml with safe defaults

# 3. Configure OpenClaw to load plugin
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

---

## 6. CLI Tool Design

**Commands**:

### `safetyclawz init`
Generate default policy file:
```bash
safetyclawz init
# Creates ~/.safetyclawz/policy.yaml
# Prompts for: phone number, team email, allowed Discord/Slack channels
```

### `safetyclawz validate`
Validate policy syntax:
```bash
safetyclawz validate ~/.safetyclawz/policy.yaml
# Output:
# ✓ YAML syntax valid
# ✓ Schema valid
# ⚠ Warning: No messaging.allowed_contacts defined
```

### `safetyclawz audit`
Query audit logs:
```bash
# Show all blocks in last 24 hours
safetyclawz audit --blocked --last-24h

# Show all exec tool calls
safetyclawz audit --tool exec

# Show JSON output
safetyclawz audit --json | jq '.[] | select(.decision.decision == "BLOCK")'
```

---

## 7. Performance Budget

### 7.1 Latency Targets

| Operation | Target | Notes |
|-----------|--------|-------|
| Policy file load | <100ms | Cached in memory after first load |
| Allowlist check | <5ms | O(1) hash lookup |
| Blocklist check | <10ms | O(n) regex patterns, n=small |
| Rate limit check | <1ms | O(1) map lookup |
| Audit log write (sync) | <5ms | Append-only file write |
| Total before_tool_call | **<50ms P95** | Combined overhead |
| Total latency budget | **<200ms P95** | Including tool execution |

### 7.2 Memory Budget

| Component | Memory | Notes |
|-----------|--------|-------|
| Policy cache | ~10KB | Single YAML file in memory |
| Rate limiter | ~1KB | Small map of counters |
| Audit buffer | ~50KB | Async write buffer |
| **Total plugin overhead** | **~100KB** | Minimal footprint |

---

## 8. Error Handling Strategy

### 8.1 Fail-Closed Principle

**All errors default to BLOCK**:
- Policy file missing → BLOCK (cannot validate safety)
- Policy syntax error → BLOCK (cannot parse rules)
- Evaluation exception → BLOCK (unknown safety state)
- Rate limiter error → BLOCK (cannot enforce limits)

### 8.2 Graceful Degradation

**Non-critical errors continue**:
- Secret redaction error → Log warning, redact entire result
- Rate limiter cleanup error → Log warning, continue enforcement

**Audit logging is critical in V1**:
- Audit log write fails → BLOCK (do not proceed without logging)

---

## 9. Testing Strategy

### 9.1 Unit Tests

**Coverage targets**: 90%+

```typescript
// Example: Policy engine tests
describe('PolicyEngine', () => {
  it('blocks commands not in allowlist', () => {
    const policy = { safeguards: { exec: { mode: 'allowlist', allowed_commands: ['git'] } } };
    const engine = new PolicyEngine(policy);
    const result = engine.evaluate({ toolName: 'exec', params: { command: 'rm -rf /' } });
    expect(result.decision).toBe('BLOCK');
  });
  
  it('allows commands in allowlist', () => {
    const policy = { safeguards: { exec: { mode: 'allowlist', allowed_commands: ['git'] } } };
    const engine = new PolicyEngine(policy);
    const result = engine.evaluate({ toolName: 'exec', params: { command: 'git status' } });
    expect(result.decision).toBe('ALLOW');
  });
});
```

### 9.2 Integration Tests

**Test with real OpenClaw instance**:

```typescript
describe('SafetyClawz OpenClaw Integration', () => {
  it('blocks exec tool when command not in allowlist', async () => {
    // Load plugin into OpenClaw test instance
    const openclaw = await startTestOpenClaw({ plugins: ['safetyclawz'] });
    
    // Invoke exec tool
    const result = await openclaw.exec({ command: 'rm -rf /' });
    
    // Verify blocked
    expect(result.error).toContain('blocked');
  });
});
```

### 9.3 E2E Tests

**User scenarios**:
1. Install plugin → Verify loaded
2. Create policy → Validate syntax
3. Trigger block → Verify audit log entry
4. Exceed rate limit → Verify block
5. Allowed action → Verify execution + log

---

## 10. Security Considerations

### 10.1 MITRE ATLAS Threat Model Alignment

SafetyClawz mitigations map directly to **MITRE ATLAS** techniques (IDs from OpenClaw's `THREAT-MODEL-ATLAS.md`):

#### Trust Boundary 3: Tool Execution (SafetyClawz Focus)

| ATLAS Technique | Threat | SafetyClawz Mitigation |
|----------------|--------|------------------------|
| **AML.T0051.000** - LLM Prompt Injection: Direct | Malicious commands via user input | Block dangerous exec patterns (e.g., `rm -rf /`, `curl \| bash`) |
| **AML.T0051.001** - LLM Prompt Injection: Indirect | Injected instructions in fetched content trigger tool abuse | Block dangerous exec patterns; path-based blocking for sensitive files |
| **AML.T0043** - Craft Adversarial Data | Obfuscated commands that bypass approval allowlists | Block known-dangerous patterns, normalize commands before matching |
| **AML.T0009** - Collection | Data theft via messaging/web tools | Rate limit messaging, allowlist contacts |
| **AML.T0010.001** - Supply Chain Compromise: AI Software | Malicious skill modifies agent files | Block writes to `~/.openclaw/skills/`, `~/.bashrc`, `/etc/cron.d/` |

#### Fail-Closed Enforcement

- **Policy evaluation errors** → BLOCK (safe default)
- **Missing policy file** → Plugin disabled (prevents silent bypass)
- **Rate limit exceeded** → BLOCK (prevents DoS)
- **Redaction failure** → Redact entire result (prevents secret leaks)

#### Audit Trail for Forensics

- **JSONL format** - Queryable audit logs for incident response
- **Append-only** - Tamper-resistant logging (future: hash-chaining)
- **Timestamp precision** - Millisecond-level event correlation
- **Decision reasoning** - Every BLOCK/ALLOW includes triggered rule

This aligns with MITRE ATLAS's emphasis on **detection, prevention, and response** for AI systems.

**Reference**: OpenClaw's full threat model at `src/openclaw/docs/security/THREAT-MODEL-ATLAS.md` (604 lines).

### 10.2 Policy File Security

- Policy file must be read-only to agents
- Stored in user home directory (`~/.safetyclawz/policy.yaml`)
- Permissions: 0600 (user read/write only)
- No environment variable substitution (prevents injection)

### 10.3 Audit Log Integrity

- Append-only writes (no deletion/modification)
- JSONL format (each line is complete record)
- File permissions: 0644 (user write, world read for compliance)
- Future: Hash-chaining for tamper detection (Growth phase)

### 10.4 Secret Redaction

- Redact patterns applied to ALL tool results
- Audit logs must NOT contain secrets
- Redaction happens BEFORE writing to log
- Fail-safe: Redact entire result if pattern matching errors

---

## 11. Development Roadmap

### Sprint 1 (Week 1-2): Core Infrastructure
- [ ] Plugin scaffold (package.json, tsconfig.json, openclaw.plugin.json)
- [ ] YAML policy loader with validation
- [ ] TypeScript types (PolicyConfig, PolicyDecision, etc.)
- [ ] Unit test harness

### Sprint 2 (Week 3-4): Policy Engine
- [ ] Exec tool allowlist evaluator
- [ ] Blocklist pattern matching
- [ ] Path blocklist logic
- [ ] Unit tests (90%+ coverage)

### Sprint 3 (Week 5-6): Messaging & Files
- [ ] Outbound recipient allowlist evaluator
- [ ] Channel allowlist evaluator
- [ ] File path blocklist evaluator
- [ ] Rate limiter implementation

### Sprint 4 (Week 7-8): Audit Logging
- [ ] JSONL audit logger
- [ ] Secret redaction logic
- [ ] Audit query interface
- [ ] Integration tests with OpenClaw

### Sprint 5 (Week 9-10): CLI Tool
- [ ] `safetyclawz init` command
- [ ] `safetyclawz validate` command
- [ ] `safetyclawz audit` command
- [ ] CLI tests

### Sprint 6 (Week 11-12): Polish & Launch
- [ ] Documentation (README, policy reference, cookbook)
- [ ] E2E tests
- [ ] npm package publish
- [ ] Community beta release

---

## 12. Open Questions

1. **Policy hot-reload**: Should policy changes apply immediately without OpenClaw restart?
   - **Recommendation**: V1 requires restart, Growth adds hot-reload

2. **Multi-policy support**: Support policy inheritance/composition?
   - **Recommendation**: V1 single file, Growth adds includes/extends

3. **Rate limiter persistence**: Should rate limits survive restarts?
   - **Recommendation**: V1 in-memory (reset on restart), Growth adds persistence

4. **Audit log rotation**: When to rotate audit.jsonl?
   - **Recommendation**: V1 manual rotation, Growth adds auto-rotation (1GB max, keep 10 files)

5. **Secret redaction accuracy**: Use simple regex or AI-based detection?
   - **Recommendation**: V1 regex patterns, Growth adds entropy-based detection

---

## 13. Success Metrics

### 13.1 Technical Metrics

- **Latency**: P95 <50ms hook overhead, P99 <100ms
- **Memory**: <100KB plugin overhead
- **Reliability**: 99.9% evaluation success rate
- **Coverage**: 90%+ unit test coverage

### 13.2 User Metrics

- **Installation**: <10 minutes to first protection
- **False positives**: <1% of evaluated actions
- **Audit log size**: <10MB per 10K tool calls
- **Policy authoring**: 85%+ success rate on first attempt

---

**Status**: Ready for prototype implementation
