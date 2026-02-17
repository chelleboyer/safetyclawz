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
  api.registerHook('before_tool_call', async (event, ctx) => {
    const { toolName, params } = event;
    const startTime = Date.now();

    // Only intercept exec tools for prototype
    if (toolName !== 'exec' && !toolName.includes('exec')) {
      return; // Allow non-exec tools
    }

    const command = params.command || params.cmd || '';
    
    // Log evaluation start
    logger.evaluating(toolName, command);

    // Check blocked commands
    const blockedCommands = policy.safeguards?.exec?.blocked_commands || [];
    for (const blocked of blockedCommands) {
      logger.checkingRule('blocked_commands', blocked, command.includes(blocked));
      
      if (command.includes(blocked)) {
        const reason = `Command contains dangerous pattern "${blocked}"`;
        logger.blocked(toolName, reason, { command, pattern: blocked });
        
        // RETURN BLOCK - This prevents tool execution
        return {
          block: true,
          blockReason: `🛑 SafetyClawz BLOCKED: ${reason}`,
        };
      }
    }

    // Check blocked paths
    const blockedPaths = policy.safeguards?.exec?.blocked_paths || [];
    for (const blockedPath of blockedPaths) {
      logger.checkingRule('blocked_paths', blockedPath, command.includes(blockedPath));
      
      if (command.includes(blockedPath)) {
        const reason = `Command references protected path "${blockedPath}"`;
        logger.blocked(toolName, reason, { command, path: blockedPath });
        
        return {
          block: true,
          blockReason: `🛑 SafetyClawz BLOCKED: ${reason}`,
        };
      }
    }

    // ALLOW - Command passes policy
    const duration = Date.now() - startTime;
    logger.allowed(toolName, command, { duration });
    return; // No block = allow execution
  });

  // Register after_tool_call hook - AUDIT LOG
  api.registerHook('after_tool_call', async (event, ctx) => {
    const { toolName, params, result, error, durationMs } = event;

    // Log audit entry
    logger.audit(toolName, !error, durationMs);

    // Simple audit log to console (file logging in full version)
    const logEntry = {
      timestamp: new Date().toISOString(),
      toolName,
      params,
      success: !error,
      error: error?.message,
    };

    logger.debug('Tool execution complete', logEntry);
  });

  // Plugin ready
  api.logger.info('🛡️  SafetyClawz: Protection enabled (prototype v0.1.0)');
}
