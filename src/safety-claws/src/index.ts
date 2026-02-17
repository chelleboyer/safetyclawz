/**
 * SafetyClawz Prototype - Minimal OpenClaw Plugin
 * 
 * Demonstrates:
 * - before_tool_call hook blocking capability
 * - Simple blocklist pattern matching
 * - YAML policy loading
 * - Integration with OpenClaw's security knowledge
 */

import type { OpenClawPluginApi } from 'openclaw/plugin-sdk';
import fs from 'node:fs';
import path from 'node:path';
import { parse as parseYAML } from 'yaml';
import { getDefaultSecurityPolicy } from './openclaw-security.js';
import { logger } from './logger.js';
import { AuditLogger } from './audit-logger.js';

/**
 * Test whether a command matches a blocked pattern.
 * Patterns containing regex metacharacters (.*+?|[]{}()\^$) are
 * treated as regular expressions; everything else is a literal
 * substring check.  If a regex pattern is malformed, we fall back
 * to a safe literal check so that a bad rule never silently allows
 * a dangerous command.
 */
function matchesPattern(command: string, pattern: string): boolean {
  const hasRegexChars = /[.*+?|\[\]{}()\\^$]/.test(pattern);
  if (!hasRegexChars) {
    return command.includes(pattern);
  }
  try {
    return new RegExp(pattern).test(command);
  } catch {
    // Malformed regex — fall back to literal match
    return command.includes(pattern);
  }
}

interface PolicyConfig {
  safeguards?: {
    exec?: {
      blocked_commands?: string[];
      blocked_paths?: string[];
    };
  };
}

export default function SafetyClawzPlugin(api: OpenClawPluginApi) {
  // Load policy file
  const policyPath = api.pluginConfig?.policyFile || '~/.safetyclawz/policy.yaml';
  const resolvedPath = policyPath.replace('~', process.env.HOME || process.env.USERPROFILE || '');
  
  // Initialize audit logger (writes to ~/.safetyclawz/audit.jsonl)
  const auditLogPath = api.pluginConfig?.auditLogPath as string | undefined;
  const auditLogger = new AuditLogger({
    logPath: auditLogPath,
    disabled: process.env.SAFETYCLAWZ_AUDIT === 'false',
  });
  
  let policy: PolicyConfig = {};
  
  try {
    if (fs.existsSync(resolvedPath)) {
      const yamlContent = fs.readFileSync(resolvedPath, 'utf-8');
      policy = parseYAML(yamlContent) as PolicyConfig;
    } else {
      // Use defaults based on OpenClaw's security knowledge
      // See: src/openclaw/src/security/dangerous-tools.ts
      policy = getDefaultSecurityPolicy();
    }
  } catch (err) {
    logger.error('Failed to load policy', err as Error);
    api.logger.error(`SafetyClawz: Failed to load policy: ${err}`);
    return; // Disable plugin on error
  }

  // Initialize logger with policy stats
  logger.init(resolvedPath, {
    blockedCommands: policy.safeguards?.exec?.blocked_commands?.length || 0,
    blockedPaths: policy.safeguards?.exec?.blocked_paths?.length || 0,
  });

  // Register before_tool_call hook - ENFORCES POLICY
  api.on('before_tool_call', async (event, ctx) => {
    const { toolName, params } = event;
    const startTime = Date.now();

    // Only intercept exec tools for prototype
    if (toolName !== 'exec' && !toolName.includes('exec')) {
      return; // Allow non-exec tools
    }

    const command = params.command || params.cmd || '';
    
    // Log evaluation start
    logger.evaluating(toolName, command);

    // Check blocked commands (patterns may be literal substrings or regexes)
    const blockedCommands = policy.safeguards?.exec?.blocked_commands || [];
    for (const blocked of blockedCommands) {
      const matched = matchesPattern(command, blocked);
      logger.checkingRule('blocked_commands', blocked, matched);
      
      if (matched) {
        const reason = `Command contains dangerous pattern "${blocked}"`;
        const duration = Date.now() - startTime;
        logger.blocked(toolName, reason, { command, pattern: blocked });

        // Audit log: BLOCK
        auditLogger.logPolicyCheck({
          toolName,
          params: params as Record<string, unknown>,
          decision: 'BLOCK',
          reason,
          triggeredRule: 'exec.blocked_commands',
          durationMs: duration,
        });
        
        // RETURN BLOCK - This prevents tool execution
        return {
          block: true,
          blockReason: `🛑 SafetyClawz BLOCKED: ${reason}`,
        };
      }
    }

    // Check blocked paths (always literal substring match)
    const blockedPaths = policy.safeguards?.exec?.blocked_paths || [];
    for (const blockedPath of blockedPaths) {
      logger.checkingRule('blocked_paths', blockedPath, command.includes(blockedPath));
      
      if (command.includes(blockedPath)) {
        const reason = `Command references protected path "${blockedPath}"`;
        const duration = Date.now() - startTime;
        logger.blocked(toolName, reason, { command, path: blockedPath });

        // Audit log: BLOCK
        auditLogger.logPolicyCheck({
          toolName,
          params: params as Record<string, unknown>,
          decision: 'BLOCK',
          reason,
          triggeredRule: 'exec.blocked_paths',
          durationMs: duration,
        });
        
        return {
          block: true,
          blockReason: `🛑 SafetyClawz BLOCKED: ${reason}`,
        };
      }
    }

    // ALLOW - Command passes policy
    const duration = Date.now() - startTime;
    logger.allowed(toolName, command, { duration });

    // Audit log: ALLOW
    auditLogger.logPolicyCheck({
      toolName,
      params: params as Record<string, unknown>,
      decision: 'ALLOW',
      reason: 'Command passes all policy checks',
      durationMs: duration,
    });

    return; // No block = allow execution
  });

  // Register after_tool_call hook - AUDIT LOG
  api.on('after_tool_call', async (event, ctx) => {
    const { toolName, params, result, error, durationMs } = event;

    // Log audit entry
    logger.audit(toolName, !error, durationMs);

    // Persistent JSONL audit log
    auditLogger.logToolExecution({
      toolName,
      params: params as Record<string, unknown>,
      success: !error,
      durationMs,
      error: error || undefined,
    });

    logger.debug('Tool execution complete', {
      timestamp: new Date().toISOString(),
      toolName,
      params,
      success: !error,
      error,
    });
  });

  // Plugin ready
  api.logger.info('🛡️  SafetyClawz: Protection enabled (prototype v0.1.0)');
}
