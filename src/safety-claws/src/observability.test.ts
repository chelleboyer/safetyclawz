/**
 * SafetyClawz Observability Demo
 * 
 * Demonstrates color-coded debug output during policy evaluation
 * 
 * Run: SAFETYCLAWZ_DEBUG=true npm test
 */

import { describe, it, expect, beforeEach } from 'vitest';
import SafetyClawzPlugin from './index.js';

describe('Observability Demo', () => {
  let mockApi: any;
  let pluginInstance: any;

  beforeEach(() => {
    // Mock OpenClaw Plugin API
    const hooks: any = {
      before_tool_call: [],
      after_tool_call: [],
    };

    mockApi = {
      pluginConfig: {},
      logger: {
        info: (msg: string) => console.log(`[OpenClaw] ${msg}`),
        debug: (msg: string) => console.log(`[OpenClaw] ${msg}`),
        warn: (msg: string) => console.warn(`[OpenClaw] ${msg}`),
        error: (msg: string) => console.error(`[OpenClaw] ${msg}`),
      },
      registerHook: (hookName: string, handler: Function) => {
        hooks[hookName].push(handler);
      },
    };

    // Initialize plugin
    pluginInstance = SafetyClawzPlugin(mockApi);

    // Capture hook handlers
    mockApi.getHook = (hookName: string) => hooks[hookName][0];
  });

  it('demonstrates observability with dangerous command (rm -rf /)', async () => {
    const beforeHook = mockApi.getHook('before_tool_call');

    const result = await beforeHook(
      {
        toolName: 'exec',
        params: { command: 'rm -rf /' },
      },
      {}
    );

    // Should be blocked
    expect(result?.block).toBe(true);
    expect(result?.blockReason).toContain('dangerous pattern');
    
    console.log('\n✓ Blocked dangerous command\n');
  });

  it('demonstrates observability with safe command (echo hello)', async () => {
    const beforeHook = mockApi.getHook('before_tool_call');

    const result = await beforeHook(
      {
        toolName: 'exec',
        params: { command: 'echo hello world' },
      },
      {}
    );

    // Should be allowed
    expect(result).toBeUndefined(); // undefined = allow
    
    console.log('\n✓ Allowed safe command\n');
  });

  it('demonstrates observability with protected path access (~/.ssh)', async () => {
    const beforeHook = mockApi.getHook('before_tool_call');

    const result = await beforeHook(
      {
        toolName: 'exec',
        params: { command: 'cat ~/.ssh/id_rsa' },
      },
      {}
    );

    // Should be blocked
    expect(result?.block).toBe(true);
    expect(result?.blockReason).toContain('protected path');
    
    console.log('\n✓ Blocked protected path access\n');
  });

  it('demonstrates observability with audit logging', async () => {
    const afterHook = mockApi.getHook('after_tool_call');

    await afterHook(
      {
        toolName: 'exec',
        params: { command: 'git status' },
        result: { stdout: 'On branch main' },
        error: null,
        durationMs: 45,
      },
      {}
    );

    console.log('\n✓ Logged tool execution\n');
  });
});
