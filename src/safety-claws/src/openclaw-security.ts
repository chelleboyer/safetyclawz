/**
 * OpenClaw Security Integration
 * 
 * SafetyClawz leverages OpenClaw's built-in security knowledge from:
 * src/openclaw/src/security/dangerous-tools.ts
 * 
 * This ensures SafetyClawz policies align with OpenClaw's own threat model.
 */

/**
 * Dangerous tools identified by OpenClaw's security team.
 * 
 * Source: src/openclaw/src/security/dangerous-tools.ts
 * 
 * These tools are considered high-risk because they enable:
 * - Remote code execution (sessions_spawn)
 * - Cross-session injection (sessions_send)
 * - Control plane manipulation (gateway)
 * - Filesystem mutation (fs_write, fs_delete, fs_move)
 * - Shell command execution (exec, spawn, shell)
 * - Code modification (apply_patch)
 */
export const OPENCLAW_DANGEROUS_TOOLS = [
  'exec',
  'spawn',
  'shell',
  'sessions_spawn',
  'sessions_send',
  'gateway',
  'fs_write',
  'fs_delete',
  'fs_move',
  'apply_patch',
] as const;

/**
 * Tools denied via OpenClaw's Gateway HTTP interface by default.
 * 
 * Source: src/openclaw/src/security/dangerous-tools.ts
 * 
 * Rationale:
 * - sessions_spawn: RCE via remote agent spawning
 * - sessions_send: Cross-session message injection
 * - gateway: Gateway reconfiguration attack
 * - whatsapp_login: Interactive setup hangs on HTTP
 */
export const OPENCLAW_GATEWAY_HTTP_DENIED_TOOLS = [
  'sessions_spawn',
  'sessions_send',
  'gateway',
  'whatsapp_login',
] as const;

/**
 * Dangerous shell command patterns.
 * 
 * Based on OpenClaw's skill-scanner.ts detection rules.
 */
export const DANGEROUS_EXEC_PATTERNS = [
  // Recursive deletion
  'rm -rf /',
  'sudo rm',
  'del /F /S /Q C:\\\\*',
  'format C:',
  
  // Disk operations
  'dd if=/dev/zero',
  'mkfs.',
  
  // Fork bombs
  ':(){ :|:& };:',
  
  // Piped execution (common in supply-chain attacks)
  'curl.*| sh',
  'curl.*| bash',
  'wget.*| sh',
  'wget.*| bash',
  
  // System modification
  'chmod 777',
  'chown root',
] as const;

/**
 * Protected filesystem paths.
 * 
 * Based on OpenClaw's audit.ts filesystem permission checks
 * and skill-scanner.ts env-harvesting detection.
 */
export const PROTECTED_PATHS = [
  // SSH keys
  '~/.ssh',
  
  // Cloud credentials
  '~/.aws',
  '~/.config/gcloud',
  '~/.azure',
  
  // System files (Unix)
  '/etc/passwd',
  '/etc/shadow',
  '/etc/sudoers',
  
  // System files (Windows)
  'C:\\Windows\\System32',
  'C:\\Program Files',
  
  // OpenClaw state (prevent self-modification)
  '~/.openclaw/config.json',
  '~/.openclaw/state',
] as const;

/**
 * Get default policy based on OpenClaw's security knowledge.
 */
export function getDefaultSecurityPolicy() {
  return {
    safeguards: {
      exec: {
        blocked_commands: [...DANGEROUS_EXEC_PATTERNS],
        blocked_paths: [...PROTECTED_PATHS],
      },
    },
  };
}
