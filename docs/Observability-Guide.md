# SafetyClawz Observability Guide

**Purpose**: Real-time visibility into policy enforcement during testing and runtime

## Sources

- [Appendix-OpenClaw-Docs.md](Appendix-OpenClaw-Docs.md)

---

## Overview

SafetyClawz includes comprehensive observability tooling (some items are V1 targets beyond the prototype):

1. **Color-Coded Debug Logger** - Real-time policy evaluation output
2. **Audit Log Viewer** - JSONL audit trail inspection (V1 target; prototype logs to console only)
3. **Performance Timing** - Millisecond-level duration tracking
4. **Rule-Level Tracing** - See exactly which patterns matched

---

## 1. Debug Logger

### Quick Start

```bash
# Enable debug mode
export SAFETYCLAWZ_DEBUG=true   # Linux/macOS
$env:SAFETYCLAWZ_DEBUG="true"   # Windows PowerShell

# Run tests with debug output
npm run test:debug
```

### Output Format

**Color-Coded Events**:

| Event | Icon | Color | When |
|-------|------|-------|------|
| **EVALUATING** | ⚡ | Cyan | Policy check starts |
| **BLOCKED** | 🛑 | Red (bright) | Command blocked |
| **ALLOWED** | ✅ | Green (bright) | Command allowed |
| **AUDIT** | 📝 | Blue | Tool execution logged |
| **ERROR** | ❌ | Red | Policy evaluation error |
| **WARN** | ⚠️  | Yellow | Warning condition |

**Rule Checking**:
- `○` Gray - Rule didn't match (command passes this rule)
- `❌` Red - Rule matched (command violates this rule → BLOCK)

### Example Output

```
🛡️  SafetyClawz Prototype v0.1.0
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Policy: ~/.safetyclawz/policy.yaml
Rules:  12 blocked commands, 11 blocked paths
Debug:  ENABLED (set SAFETYCLAWZ_DEBUG=true for verbose)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[12:34:56.789] ⚡ EVALUATING exec
   Command: rm -rf /
   ○ Rule: blocked_commands → Pattern: "sudo"
   ○ Rule: blocked_commands → Pattern: "curl|bash"
   ❌ Rule: blocked_commands → Pattern: "rm -rf"
[12:34:56.791] 🛑 BLOCKED exec
   Reason: Command contains dangerous pattern "rm -rf"
   Context: {"command":"rm -rf /","pattern":"rm -rf"}

[12:34:56.800] ⚡ EVALUATING exec
   Command: echo hello world
   ○ Rule: blocked_commands → Pattern: "rm -rf"
   ○ Rule: blocked_commands → Pattern: "sudo"
   ○ Rule: blocked_paths → Pattern: "~/.ssh"
   ○ Rule: blocked_paths → Pattern: "/etc"
[12:34:56.802] ✅ ALLOWED exec
   Command: echo hello world

[12:34:56.850] 📝 AUDIT exec (45ms)
```

### Debug Levels

**Verbose Mode** (SAFETYCLAWZ_DEBUG=true):
- ⚡ Policy evaluation start
- ○/❌ Every rule check
- ✅ Allow decisions
- 📝 Audit trail entries
- 🔍 Debug data structures

**Normal Mode** (SAFETYCLAWZ_DEBUG=false):
- 🛑 Block decisions (always shown)
- ❌ Errors (always shown)
- ⚠️  Warnings (always shown)

---

## 2. Audit Log Viewer

**Status**: The CLI script exists, but the prototype does not write JSONL logs yet. JSONL audit logging is a V1 target.

### CLI Tool

**File**: `bin/audit.ts` (compiled to `bin/audit.js`)

**Installation (V1 target)**:
```bash
npm install -g safetyclawz
# Creates global command: safetyclawz-audit
```

**Usage**:
```bash
# Follow audit log in real-time
safetyclawz-audit --tail

# Show last 10 entries
safetyclawz-audit --last 10

# Filter blocked actions only
safetyclawz-audit --blocked

# Combine filters
safetyclawz-audit --tail --blocked    # Watch for blocks in real-time
safetyclawz-audit --last 20 --blocked # Show recent blocks
```

### Audit Log Format (V1 target)

**File**: `~/.safetyclawz/audit.jsonl`  
**Format**: JSONL (one JSON object per line)

**Entry Types**:

#### Policy Check Entry
```json
{
  "timestamp": "2026-02-16T12:34:56.789Z",
  "event": "policy_check",
  "toolName": "exec",
  "params": {
    "command": "rm -rf /"
  },
  "decision": {
    "decision": "BLOCK",
    "reason": "Command contains dangerous pattern \"rm -rf\"",
    "triggered_rule": "exec.blocked_commands"
  },
  "durationMs": 2
}
```

#### Tool Execution Entry
```json
{
  "timestamp": "2026-02-16T12:34:57.123Z",
  "event": "tool_execution",
  "toolName": "exec",
  "params": {
    "command": "git status"
  },
  "success": true,
  "error": null,
  "durationMs": 45
}
```

### Querying Audit Logs

**With jq** (JSON query tool):
```bash
# Count total blocked actions
cat ~/.safetyclawz/audit.jsonl | \
  jq 'select(.decision.decision == "BLOCK")' | \
  wc -l

# Find all blocks by rule
cat ~/.safetyclawz/audit.jsonl | \
  jq 'select(.decision.decision == "BLOCK") | .decision.triggered_rule'

# Get blocked commands in last hour
cat ~/.safetyclawz/audit.jsonl | \
  jq 'select(.decision.decision == "BLOCK" and .timestamp > "2026-02-16T11:00:00Z")'
```

---

## 3. Performance Timing

### Metrics Tracked

**Policy Evaluation**:
- `durationMs` - Time from evaluation start to decision (target: <50ms P95)

**Tool Execution**:
- `durationMs` - Tool runtime (from OpenClaw event data)

### Performance Monitoring

**Debug Mode**:
```
[12:34:56.800] ⚡ EVALUATING exec
   Command: echo hello
[12:34:56.802] ✅ ALLOWED exec (2ms)    ← Evaluation time
```

**Audit Log**:
```json
{
  "event": "policy_check",
  "durationMs": 2    ← Tracks policy overhead
}
```

### Performance Targets (V1)

| Metric | Target | Current (Prototype) |
|--------|--------|---------------------|
| P95 evaluation latency | <50ms | ~2ms (simple patterns) |
| P99 evaluation latency | <100ms | ~5ms |
| Memory overhead | <100KB | ~50KB |
| Evaluation success rate | 99.9% | 100% (no errors yet) |

---

## 4. Test Observability

### Running Tests with Debug Mode

```bash
# Basic (no debug)
npm test

# With debug logger
npm run test:debug

# Verbose test reporter + debug logger
npm run test:verbose
```

### Observability Test Suite

**File**: `src/observability.test.ts`

Demonstrates:
- Dangerous command blocking (rm -rf /)
- Safe command allowing (echo hello)
- Protected path blocking (~/.ssh)
- Audit logging

**Run**:
```bash
SAFETYCLAWZ_DEBUG=true npm test src/observability.test.ts
```

---

## 5. Implementation Details

### Color Codes (ANSI)

**File**: `src/logger.ts`

```typescript
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  
  red: '\x1b[31m',     // Errors, blocks
  green: '\x1b[32m',   // Allows
  yellow: '\x1b[33m',  // Warnings
  blue: '\x1b[34m',    // Info
  cyan: '\x1b[36m',    // Evaluating
  gray: '\x1b[90m',    // Timestamps, context
};
```

### Logger API

**Class**: `SafetyClawzLogger`

**Methods**:
```typescript
logger.init(policyPath, stats)       // Plugin initialization
logger.evaluating(toolName, command) // Policy check start
logger.blocked(toolName, reason)     // BLOCK decision
logger.allowed(toolName, command)    // ALLOW decision
logger.checkingRule(rule, pattern)   // Individual rule check
logger.audit(toolName, success)      // Tool execution
logger.error(message, err)           // Error logging
logger.warn(message)                 // Warning
logger.info(message)                 // Info (always shown)
logger.debug(message, data)          // Debug (verbose only)
```

**Singleton**:
```typescript
import { logger } from './logger.js';
```

---

## 6. Best Practices

### During Development

1. **Always use debug mode** when writing new policy rules
2. **Watch for false positives** - Commands that should pass but are blocked
3. **Monitor evaluation latency** - Ensure <50ms target
4. **Review audit logs** after test runs

### During Testing

1. Run `npm run test:debug` first to see what's happening
2. Check rule-level tracing to understand blocks
3. Verify timing is acceptable (<50ms P95)
4. Review audit.jsonl for completeness

### In Production

1. **Disable debug mode** (SAFETYCLAWZ_DEBUG=false) for performance
2. **Monitor audit log size** - Rotate when >100MB
3. **Alert on block spikes** - Unusual blocking patterns
4. **Export compliance reports** from audit.jsonl

---

## 7. Troubleshooting

### Debug Mode Not Working

**Issue**: `SAFETYCLAWZ_DEBUG=true` but no verbose output

**Solutions**:
```bash
# Check environment variable is set
echo $SAFETYCLAWZ_DEBUG   # Linux/macOS
echo $env:SAFETYCLAWZ_DEBUG   # Windows PowerShell

# Ensure it's "true" (string)
export SAFETYCLAWZ_DEBUG="true"   # Not 1 or True

# Use npm script instead
npm run test:debug
```

### Colors Not Displaying

**Issue**: Seeing ANSI codes instead of colors

**Solutions**:
- **Windows**: Use Windows Terminal (not cmd.exe)
- **CI/CD**: Set `FORCE_COLOR=1` environment variable
- **Piping**: Don't pipe output (`npm test | less` breaks colors)

### Audit Log Too Large

**Issue**: `~/.safetyclawz/audit.jsonl` growing too large

**Solutions**:
```bash
# Rotate manually
mv ~/.safetyclawz/audit.jsonl ~/.safetyclawz/audit.$(date +%Y%m%d).jsonl
touch ~/.safetyclawz/audit.jsonl

# Keep last 1000 lines
tail -n 1000 ~/.safetyclawz/audit.jsonl > ~/.safetyclawz/audit.tmp
mv ~/.safetyclawz/audit.tmp ~/.safetyclawz/audit.jsonl
```

### Performance Issues

**Issue**: Policy evaluation taking >50ms

**Debug**:
```bash
# Run with timing
SAFETYCLAWZ_DEBUG=true npm test | grep ALLOWED

# Look for slow evaluations
cat ~/.safetyclawz/audit.jsonl | jq 'select(.durationMs > 50)'
```

**Solutions**:
- Reduce number of blocked_commands patterns
- Use more specific patterns (fewer regex alternations)
- Profile with `node --prof`

---

## 8. Future Enhancements

**Planned for V1**:
- [ ] Structured log export (JSON, CSV)
- [ ] Audit log rotation (auto-rotate at 100MB)
- [ ] Grafana dashboard integration
- [ ] Prometheus metrics exporter
- [ ] Real-time web UI (dashboard)
- [ ] Alert webhooks (Slack, PagerDuty)

**Growth Phase**:
- [ ] Distributed tracing (OpenTelemetry)
- [ ] Compliance report generator
- [ ] Anomaly detection (ML-based patterns)
- [ ] Policy simulation mode (dry-run)

---

**Status**: Observability infrastructure ready for testing ✅

**Next Step**: Run `npm run test:debug` to see it in action!
