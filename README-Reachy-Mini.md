# 🦾 SafetyClawz for Reachy Mini Retail Assistant

**Runtime Safety Layer for Customer-Facing Humanoid Robots**

[![Reachy Mini](https://img.shields.io/badge/Robot-Reachy_Mini-blue.svg)](https://www.pollen-robotics.com/)
[![SafetyClawz](https://img.shields.io/badge/SafetyClawz-Enabled-green.svg)](https://github.com/yourusername/safety_claws)
[![OpenClaw Plugin](https://img.shields.io/badge/OpenClaw-Plugin-blue.svg)](https://github.com/openclaw/openclaw)

---

## Overview

This README documents the **SafetyClawz deployment** for Reachy Mini humanoid robots operating as retail assistants. When AI agents control physical robots that interact with customers, **safety isn't optional—it's critical**.

SafetyClawz provides a **runtime execution firewall** between your OpenClaw-powered AI agent and the Reachy Mini robot, ensuring safe customer interactions, controlled physical movements, and protected business data.

---

## Why SafetyClawz for Retail Robots?

### The Retail Robot Challenge

Your Reachy Mini retail assistant running on OpenClaw can:

- 🤖 **Move physically** - arms, head, torso articulation
- 💬 **Interact with customers** - voice, gestures, screen display
- 📦 **Access inventory systems** - product databases, stock levels
- 💳 **Handle transactions** - price lookups, payment processing
- 📊 **Query business data** - sales reports, customer records
- 🔧 **Execute system commands** - restart services, update software
- 🌐 **Network access** - APIs, external services, cloud storage

**Without safety controls, AI reasoning errors could cause:**

- ⚠️ **Dangerous movements** near customers (collision risk)
- 📨 **Customer data leaks** (PII exposure in logs)
- 💣 **System corruption** (`rm -rf` on inventory database)
- 📧 **Spam attacks** (mass emails to customer contact lists)
- 🔓 **Unauthorized access** (reading payment credentials)
- 💰 **Business disruption** (invalid pricing, inventory errors)

### How SafetyClawz Protects Your Retail Operation

```
┌─────────────────────────────────────────────────────────┐
│          OpenClaw AI Agent (GPT-4, Claude, etc.)        │
│          "Show customer product XYZ inventory"          │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
           ┌─────────────────────┐
           │   SafetyClawz       │ ◄── YAML Policy Rules
           │  Execution Firewall  │
           └─────────┬───────────┘
                     │
        ┌────────────┴─────────────┐
        │                          │
        ▼                          ▼
   ✅ ALLOWED                  🛑 BLOCKED
   - Read product DB          - Delete inventory
   - Query price              - Execute shell rm
   - Move head (safe range)   - Access payment tokens
   - Display on screen        - Email mass contacts
        │                          │
        ▼                          ▼
┌──────────────────┐       ┌──────────────┐
│  Reachy Mini     │       │  Audit Log   │
│  Hardware API    │       │  + Alert     │
└──────────────────┘       └──────────────┘
```

SafetyClawz intercepts **every tool call** before execution and validates against your retail safety policy.

---

## Installation

### Prerequisites

1. **Reachy Mini robot** (Pollen Robotics) with network access
2. **OpenClaw** installed and configured
3. **Python 3.8+** and Node.js 18+

### Setup

```bash
# 1. Install SafetyClawz plugin in OpenClaw
cd /path/to/openclaw
pnpm add safety-claws

# 2. Configure OpenClaw to load the plugin
# Edit your openclaw.config.json or .env:
# PLUGINS=safety-claws

# 3. Create retail-specific safety policy
mkdir -p ~/.safetyclawz
cp config/reachy-retail-policy.yaml ~/.safetyclawz/policy.yaml

# 4. Test the setup (without robot movement)
npm run test:plugin -- safety-claws
```

---

## Retail Safety Policy Configuration

### Example: Reachy Mini Retail Policy

Create `~/.safetyclawz/policy.yaml`:

```yaml
version: "1.0"
name: "Reachy Mini Retail Assistant Safety Policy"
description: "Runtime safety controls for customer-facing humanoid robot"

# ═══════════════════════════════════════════════════════════
# PHYSICAL SAFETY - Movement Controls
# ═══════════════════════════════════════════════════════════
movement:
  max_velocity: 0.3  # m/s - safe customer approach speed
  restricted_zones:
    - name: customer_personal_space
      radius_meters: 0.5
      action: BLOCK  # Never enter customer personal space
  
  joint_limits:
    - joint: arm_right_shoulder
      max_angle: 90  # Prevent overhead reaching
      min_angle: -45
    - joint: arm_left_shoulder
      max_angle: 90
      min_angle: -45

# ═══════════════════════════════════════════════════════════
# BLOCKED COMMANDS - System Protection
# ═══════════════════════════════════════════════════════════
blocked_commands:
  patterns:
    # Destructive system commands
    - "rm -rf"
    - "sudo rm"
    - "dd if="
    - "mkfs"
    - "reboot"
    - "shutdown"
    
    # Database manipulation (inventory protection)
    - "DROP TABLE"
    - "DELETE FROM inventory"
    - "TRUNCATE"
    
    # Network attacks
    - "nmap"
    - "curl.*DELETE"
    - "wget.*--post-data"
  
  action: BLOCK
  log_level: ERROR
  alert: true

# ═══════════════════════════════════════════════════════════
# PATH PROTECTION - Data Security
# ═══════════════════════════════════════════════════════════
blocked_paths:
  patterns:
    # Credentials & secrets
    - "~/.ssh/*"
    - "~/.aws/*"
    - "/etc/ssl/*"
    - "**/payment_credentials.json"
    - "**/api_keys.env"
    
    # Customer data (PII)
    - "**/customer_records/*"
    - "**/transaction_history/*"
    - "/var/db/customer_pii/*"
    
    # Business critical
    - "/opt/inventory_system/db/*"
    - "/var/backup/sales_data/*"
  
  action: BLOCK
  log_level: CRITICAL
  alert: true

# ═══════════════════════════════════════════════════════════
# ALLOWED OPERATIONS - Approved Actions
# ═══════════════════════════════════════════════════════════
allowed_operations:
  # Read-only product data
  - tool: database_query
    allowed_tables:
      - products
      - inventory_public
      - product_categories
    allowed_operations: [SELECT]
    deny_operations: [INSERT, UPDATE, DELETE, DROP]
  
  # Safe robot movements
  - tool: reachy_move
    allowed_actions:
      - head_turn
      - head_nod
      - wave_gesture
      - point_gesture
    max_velocity: 0.3
    
  # Customer interaction
  - tool: display_screen
    allowed_content_types:
      - product_image
      - price_display
      - store_map
    blocked_content:
      - customer_data
      - internal_reports
  
  # Safe voice responses
  - tool: text_to_speech
    max_length_chars: 500
    allowed_languages: [en-US, es-ES, fr-FR]
    content_filter: enabled

# ═══════════════════════════════════════════════════════════
# RATE LIMITING - Abuse Prevention
# ═══════════════════════════════════════════════════════════
rate_limits:
  # Prevent message spam
  - tool: send_message
    limit: 5
    window: 1h
    action: BLOCK
    
  # Prevent inventory system overload
  - tool: database_query
    limit: 100
    window: 1m
    action: THROTTLE
    
  # Prevent movement thrashing
  - tool: reachy_move
    limit: 30
    window: 1m
    action: BLOCK

# ═══════════════════════════════════════════════════════════
# AUDIT & LOGGING
# ═══════════════════════════════════════════════════════════
audit:
  enabled: true
  output: /var/log/safetyclawz/reachy-retail-audit.jsonl
  log_all_decisions: true
  log_blocked_attempts: true
  alert_on_critical: true
  alert_webhook: https://your-monitoring-system.com/alerts
  
  # Compliance tracking
  retention_days: 90
  include_customer_interaction: true  # For incident review
  anonymize_pii: true

# ═══════════════════════════════════════════════════════════
# EMERGENCY CONTROLS
# ═══════════════════════════════════════════════════════════
emergency:
  # Physical emergency stop
  e_stop_keyword: "EMERGENCY STOP"
  e_stop_action: FREEZE_ALL_MOVEMENT
  
  # System safety
  fail_mode: safe  # Block all on policy error
  watchdog_timeout: 5s
  max_consecutive_blocks: 10  # Alert if agent repeatedly blocked
```

---

## Common Retail Use Cases

### 1. Product Information Query

**Customer:** "Do you have this product in stock?"

**AI Agent Decision Tree:**
```
1. AI generates tool call: database_query("SELECT stock FROM inventory WHERE product_id=...")
2. SafetyClawz validates:
   ✅ Tool: database_query (allowed)
   ✅ Operation: SELECT (read-only, allowed)
   ✅ Table: inventory_public (in allowed_tables)
   ✅ No blocked patterns detected
3. ALLOW → Execute query
4. AI responds: "Yes, we have 12 units in stock"
```

### 2. Dangerous Command Attempt (Blocked)

**Scenario:** AI agent hallucinates a system command

**AI Agent Decision Tree:**
```
1. AI generates tool call: exec("sudo rm -rf /tmp/cache")
2. SafetyClawz validates:
   🛑 Command matches blocked pattern: "sudo rm"
   🛑 Risk level: CRITICAL
3. BLOCK → Log incident + Alert
4. AI receives: "Error: Command blocked by safety policy"
5. AI generates alternative: "I'll use a safe cleanup method instead"
```

### 3. Customer Data Protection

**Scenario:** AI tries to access customer PII

**AI Agent Decision Tree:**
```
1. AI generates tool call: read_file("/var/db/customer_pii/records.json")
2. SafetyClawz validates:
   🛑 Path matches blocked pattern: "**/customer_pii/*"
   🛑 Risk level: CRITICAL (PII exposure)
3. BLOCK → Log + Alert security team
4. Audit log records: Attempted unauthorized PII access
```

---

## Testing Your Deployment

### Pre-Deployment Safety Test

Run these tests **before** deploying to production retail floor:

```bash
# 1. Test blocked commands are rejected
npm run test:retail -- --scenario dangerous-commands

# 2. Test movement limits are enforced
npm run test:retail -- --scenario movement-safety

# 3. Test customer data protection
npm run test:retail -- --scenario data-protection

# 4. Test rate limiting
npm run test:retail -- --scenario rate-limits

# 5. Full integration test
npm run test:retail -- --full
```

### Expected Output (Passing Tests):

```
🛡️  SafetyClawz Retail Safety Test Suite
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Dangerous Commands
   🛑 BLOCKED: "rm -rf /opt/inventory"
   🛑 BLOCKED: "sudo reboot"
   🛑 BLOCKED: "DROP TABLE products"

✅ Movement Safety
   🛑 BLOCKED: arm velocity 0.8 m/s (exceeds max 0.3)
   ✅ ALLOWED: head_turn at 0.2 m/s
   ✅ ALLOWED: wave_gesture (safe range)

✅ Data Protection
   🛑 BLOCKED: read ~/.ssh/id_rsa
   🛑 BLOCKED: read /var/db/customer_pii/
   ✅ ALLOWED: read /opt/products/catalog.json

✅ Rate Limiting
   ✅ ALLOWED: 5 messages in 1 hour
   🛑 BLOCKED: 6th message (rate limit exceeded)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
All safety tests passed! ✅
Ready for production deployment.
```

---

## Monitoring & Alerts

### Real-Time Dashboard

SafetyClawz provides retail-specific metrics:

```javascript
// Example monitoring integration
const metrics = await SafetyClawz.getMetrics();

console.log({
  total_interactions: metrics.tool_calls_total,
  blocked_attempts: metrics.blocked_count,
  customer_safety_events: metrics.movement_blocks,
  data_protection_triggers: metrics.path_blocks,
  uptime: metrics.uptime_hours,
  last_incident: metrics.last_critical_block
});
```

### Alert Configuration

Set up alerts for critical events:

```yaml
alerts:
  channels:
    - type: webhook
      url: https://your-slack-webhook.com
      events: [CRITICAL, ERROR]
    
    - type: email
      addresses: [security@yourstore.com, operations@yourstore.com]
      events: [CRITICAL]
    
    - type: sms
      numbers: ["+1-555-SECURITY"]
      events: [EMERGENCY_STOP, CONSECUTIVE_BLOCKS_THRESHOLD]

  templates:
    CRITICAL: "🚨 SafetyClawz CRITICAL: ${event} on Reachy Mini (${location})"
    EMERGENCY_STOP: "⚠️ EMERGENCY STOP triggered on ${robot_id}"
```

---

## Incident Response

### If Safety Block Occurs

1. **Review Audit Log:**
   ```bash
   tail -f /var/log/safetyclawz/reachy-retail-audit.jsonl
   ```

2. **Analyze Decision:**
   ```bash
   safetyclawz audit --last --verbose
   ```

3. **Update Policy (if needed):**
   - If legitimate action was blocked → adjust `allowed_operations`
   - If attack detected → investigate AI agent behavior
   - If customer safety risk → report to operations team

### Emergency Stop Procedure

If customer safety at risk:

1. Say **"EMERGENCY STOP"** (keyword triggers immediate freeze)
2. Physical e-stop button on Reachy Mini
3. Review incident logs before resuming operation

---

## Compliance & Documentation

### Retail Safety Standards

This configuration addresses:

- **ISO 13482** - Safety requirements for personal care robots
- **GDPR** - Customer data protection (PII blocking)
- **PCI DSS** - Payment credential protection
- **Retail Operations** - Inventory integrity, business continuity

### Audit Trail

SafetyClawz maintains JSONL audit logs for compliance:

```json
{
  "timestamp": "2026-02-18T10:23:45.123Z",
  "robot_id": "reachy-mini-store-01",
  "decision": "BLOCK",
  "tool": "exec",
  "command": "sudo rm -rf /tmp",
  "reason": "Matched blocked pattern: sudo rm",
  "risk_level": "CRITICAL",
  "customer_present": false,
  "session_id": "abc123"
}
```

---

## Performance Impact

**Typical Overhead:** ~2-5ms per tool call

- **Product query:** 3ms SafetyClawz validation + 50ms database query = 53ms total
- **Movement command:** 2ms validation + 100ms robot execution = 102ms total
- **Voice response:** 4ms validation + 800ms TTS = 804ms total

**Result:** No noticeable customer experience impact

---

## Troubleshooting

### Common Issues

**Issue:** Legitimate movement blocked  
**Solution:** Check `movement.joint_limits` - adjust angles if too restrictive

**Issue:** Product queries failing  
**Solution:** Verify table names in `allowed_operations.allowed_tables`

**Issue:** Too many alerts  
**Solution:** Adjust `log_level` from `INFO` to `WARNING` or `ERROR`

**Issue:** Rate limit too restrictive  
**Solution:** Increase `rate_limits.limit` or `window` values

---

## Development Team

**SafetyClawz Integration:** Your Team  
**Reachy Mini Robot:** [Pollen Robotics](https://www.pollen-robotics.com/)  
**OpenClaw AI Framework:** [OpenClaw Project](https://github.com/openclaw/openclaw)

---

## License

MIT License - See [LICENSE](LICENSE)

---

## Support

- **Documentation:** [docs/](docs/)
- **Issues:** [GitHub Issues](https://github.com/yourusername/safety_claws/issues)
- **Security:** security@yourcompany.com

---

**Remember:** When AI controls physical robots that interact with customers, **safety is not negotiable**. SafetyClawz ensures your Reachy Mini retail assistant operates safely, protects customer data, and maintains business integrity.

🛡️ **Stay Safe. Stay Compliant. Stay in Business.**
