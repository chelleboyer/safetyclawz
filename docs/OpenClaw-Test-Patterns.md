# OpenClaw Test Patterns Analysis

**Date**: 2026-02-16  
**Purpose**: Learn how to test SafetyClawz without OpenClaw installation

---

## Key Discovery: 1,005+ Test Files

OpenClaw has comprehensive test coverage:
- **src/openclaw/src/**: 1,005 `.test.ts` files
- **Test framework**: Vitest
- **Test types**: Unit tests, E2E tests, integration tests

---

## Relevant Test Files for SafetyClawz

### Hook System Tests

```
src/plugins/wired-hooks-after-tool-call.e2e.test.ts
src/plugins/wired-hooks-compaction.test.ts
src/plugins/wired-hooks-gateway.test.ts
src/plugins/wired-hooks-llm.test.ts
src/plugins/wired-hooks-message.test.ts
src/plugins/wired-hooks-session.test.ts
```

### Plugin System Tests

```
src/channels/plugins/plugins-channel.test.ts
src/channels/plugins/plugins-core.test.ts
src/config/config.plugin-validation.test.ts
src/config/plugin-auto-enable.test.ts
src/gateway/server-plugins.test.ts
```

### Tool Policy Tests

```
src/agents/tool-policy-pipeline.test.ts
src/agents/tool-policy.e2e.test.ts
```

---

## Test Pattern Analysis

### Pattern 1: Mock OpenClaw Plugin API

From `wired-hooks-after-tool-call.e2e.test.ts`:

```typescript
const hookMocks = vi.hoisted(() => ({
  runner: {
    hasHooks: vi.fn(() => false),
    runBeforeToolCall: vi.fn(async () => {}),
    runAfterToolCall: vi.fn(async () => {}),
  },
}));

vi.mock("../plugins/hook-runner-global.js", () => ({
  getGlobalHookRunner: () => hookMocks.runner,
}));
```

**Key Insight**: Tests mock the global hook runner, so no OpenClaw installation needed!

---

### Pattern 2: How Blocking Works

From `pi-tools.before-tool-call.ts` (lines 78-82):

```typescript
const outcome = await runBeforeToolCallHook({ toolName, params, toolCallId, ctx });

if (outcome.blocked) {
  throw new Error(outcome.reason);  // ← BLOCKS EXECUTION
}

return await execute(toolCallId, outcome.params, signal, onUpdate);
```

**Flow**:
1. Hook returns `{ block: true, blockReason: "..." }`
2. Converted to `{ blocked: true, reason: "..." }`
3. **Throws error BEFORE calling `tool.execute()`**
4. Tool never executes

---

### Pattern 3: Hook Return Values

From `hooks.ts` (lines 326-343):

**before_tool_call** (Sequential, Modifying):
```typescript
async function runBeforeToolCall(
  event: PluginHookBeforeToolCallEvent,
  ctx: PluginHookToolContext,
): Promise<PluginHookBeforeToolCallResult | undefined> {
  return runModifyingHook<"before_tool_call", PluginHookBeforeToolCallResult>(
    "before_tool_call",
    event,
    ctx,
    (acc, next) => ({
      params: next.params ?? acc?.params,      // Modify params
      block: next.block ?? acc?.block,          // Block flag
      blockReason: next.blockReason ?? acc?.blockReason,
    }),
  );
}
```

**after_tool_call** (Parallel, Fire-and-Forget):
```typescript
async function runAfterToolCall(
  event: PluginHookAfterToolCallEvent,
  ctx: PluginHookToolContext,
): Promise<void> {
  return runVoidHook("after_tool_call", event, ctx);  // No return value
}
```

---

## Testing Strategy for SafetyClawz

### ✅ Unit Tests (No OpenClaw Required)

**Mock the Plugin API**:
```typescript
interface OpenClawPluginApi {
  pluginConfig?: Record<string, any>;
  logger: { info, warn, error, debug };
  registerHook: (hookName, handler) => void;
  resolvePath?: (path: string) => string;
}
```

**Test Scenarios**:
1. Plugin loads with default policy
2. `before_tool_call` blocks dangerous commands
3. `before_tool_call` allows safe commands
4. Blocks commands with protected paths
5. `after_tool_call` logs audit trail
6. Multiple blocked patterns work

**Example** (from `src/safety-claws/src/index.test.ts`):
```typescript
it('blocks "rm -rf /" command via before_tool_call hook', async () => {
  const SafetyClawzPlugin = (await import('./index.js')).default;
  SafetyClawzPlugin(mockApi);

  const beforeToolCall = registeredHooks.get('before_tool_call')!;
  
  const result = await beforeToolCall(
    { toolName: 'exec', params: { command: 'rm -rf /' } },
    { agentId: 'main', sessionKey: 'test-session' }
  );

  expect(result).toEqual({
    block: true,
    blockReason: expect.stringContaining('dangerous pattern'),
  });
});
```

---

### ✅ Integration Tests (OpenClaw Installation Required)

**When to use**:
- V1 full version testing
- Testing with real OpenClaw instance
- End-to-end workflow validation

**Setup** (from OpenClaw vitest.config.ts):
```typescript
{
  test: {
    testTimeout: 120_000,
    hookTimeout: 180_000,
    pool: "forks",
    include: ["src/**/*.test.ts"],
    setupFiles: ["test/setup.ts"],
  }
}
```

---

## Run Tests Without OpenClaw Installation

```bash
cd src/safety-claws

# Install dependencies (includes vitest)
npm install

# Run unit tests (WORKS WITHOUT OPENCLAW!)
npm test

# Run with coverage
npm test -- --coverage

# Watch mode
npm run test:watch
```

**Expected Output**:
```
✓ loads successfully with default policy when no file exists
✓ blocks "rm -rf /" command via before_tool_call hook  
✓ allows "echo hello" command via before_tool_call hook
✓ blocks commands accessing ~/.ssh directory
✓ allows non-exec tools to pass through (prototype)
✓ logs audit trail via after_tool_call hook
✓ blocks multiple dangerous patterns
✓ uses simple case-sensitive substring matching

Test Files  1 passed (1)
     Tests  8 passed (8)
```

---

## Key Insights

### 1. **Mock-First Testing**
- OpenClaw's own tests extensively use mocks
- No full OpenClaw installation needed for most tests
- Fast iteration during development

### 2. **Blocking is Synchronous**
- `before_tool_call` runs BEFORE `tool.execute()`
- Returning `{ block: true }` throws error
- Tool never executes if blocked

### 3. **Audit is Asynchronous**
- `after_tool_call` runs in parallel
- Fire-and-forget (no return value)
- Can fail without blocking tool execution

### 4. **Sequential vs Parallel**
- **before_tool_call**: Sequential (first block wins)
- **after_tool_call**: Parallel (all handlers run concurrently)

### 5. **Error Handling**
- Hooks wrapped in try-catch
- Errors logged but don't crash OpenClaw
- SafetyClawz should fail-closed (block on errors)

---

## Next Steps

### For Prototype:
- ✅ Created `src/index.test.ts` with 8 unit tests
- ✅ Added `vitest.config.ts`
- ✅ Updated `package.json` scripts
- 🔄 Run tests to validate prototype works

### For V1:
- Add integration tests (requires OpenClaw)
- Add E2E tests (full workflow)
- Test with real policy files (.yaml)
- Test JSONL audit log writes
- Test rate limiter edge cases
- Test policy hot-reload (Growth phase)

---

## Test Coverage Goals

| Component | Unit Tests | Integration Tests | E2E Tests |
|-----------|------------|-------------------|-----------|
| Policy Engine | **90%+** | 80%+ | N/A |
| Rate Limiter | **90%+** | 80%+ | N/A |
| Audit Logger | **90%+** | 80%+ | 50%+ |
| Hook Handlers | **90%+** | 80%+ | 80%+ |
| CLI Tool | 80%+ | N/A | **90%+** |

**Prototype**: Unit tests only (8 tests, validates core blocking logic)  
**V1**: All three levels (target: 200+ tests total)

---

**Status**: Prototype tests created, ready to run standalone ✅
