/**
 * SafetyClawz JSONL Audit Logger
 *
 * Append-only audit log written to ~/.safetyclawz/audit.jsonl.
 * Each line is a self-contained JSON object so the file can be
 * tailed, streamed, and queried with standard tools (jq, grep)
 * or the bundled `safetyclawz-audit` CLI viewer.
 *
 * Design decisions (from Architecture-V1.md):
 * - Fail-closed: if an audit write fails, the plugin blocks the
 *   tool call rather than proceeding unlogged.
 * - Async buffered writes: uses an internal queue so hook handlers
 *   don't wait for disk I/O on the hot path.
 * - File is created on first write; directory is created if missing.
 */

import fs from 'node:fs';
import path from 'node:path';

// ── Types ────────────────────────────────────────────────────────────────────

/** Matches the AuditEntry interface consumed by bin/audit.ts */
export interface AuditEntry {
  timestamp: string;
  event: 'policy_check' | 'tool_execution';
  toolName: string;
  params: Record<string, unknown>;
  decision?: {
    decision: 'ALLOW' | 'BLOCK';
    reason: string;
    triggered_rule?: string;
  };
  durationMs?: number;
  success?: boolean;
  error?: string;
}

export interface AuditLoggerOptions {
  /** Override the default log path (~/.safetyclawz/audit.jsonl) */
  logPath?: string;
  /** Disable file writes (useful in tests) */
  disabled?: boolean;
}

// ── Implementation ───────────────────────────────────────────────────────────

export class AuditLogger {
  private logPath: string;
  private disabled: boolean;
  private writeQueue: string[] = [];
  private flushing = false;
  private dirEnsured = false;

  constructor(options: AuditLoggerOptions = {}) {
    const home = process.env.HOME || process.env.USERPROFILE || '';
    this.logPath = options.logPath || path.join(home, '.safetyclawz', 'audit.jsonl');
    this.disabled = options.disabled ?? false;
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /** Log a policy check (ALLOW or BLOCK) from before_tool_call. */
  logPolicyCheck(entry: {
    toolName: string;
    params: Record<string, unknown>;
    decision: 'ALLOW' | 'BLOCK';
    reason: string;
    triggeredRule?: string;
    durationMs?: number;
  }): void {
    this.enqueue({
      timestamp: new Date().toISOString(),
      event: 'policy_check',
      toolName: entry.toolName,
      params: entry.params,
      decision: {
        decision: entry.decision,
        reason: entry.reason,
        triggered_rule: entry.triggeredRule,
      },
      durationMs: entry.durationMs,
    });
  }

  /** Log a tool execution result from after_tool_call. */
  logToolExecution(entry: {
    toolName: string;
    params: Record<string, unknown>;
    success: boolean;
    durationMs?: number;
    error?: string;
  }): void {
    this.enqueue({
      timestamp: new Date().toISOString(),
      event: 'tool_execution',
      toolName: entry.toolName,
      params: entry.params,
      success: entry.success,
      durationMs: entry.durationMs,
      error: entry.error,
    });
  }

  /** Flush any buffered entries to disk. Returns a promise that resolves
   *  when all queued entries have been written. */
  async flush(): Promise<void> {
    if (this.disabled || this.writeQueue.length === 0) return;
    await this.drainQueue();
  }

  /** The resolved file path (exposed for diagnostics / tests). */
  get filePath(): string {
    return this.logPath;
  }

  // ── Internals ──────────────────────────────────────────────────────────────

  private enqueue(entry: AuditEntry): void {
    if (this.disabled) return;
    this.writeQueue.push(JSON.stringify(entry));
    void this.drainQueue();
  }

  private async drainQueue(): Promise<void> {
    if (this.flushing) return; // another drain in progress
    this.flushing = true;

    try {
      this.ensureDirectory();

      while (this.writeQueue.length > 0) {
        const line = this.writeQueue.shift()!;
        fs.appendFileSync(this.logPath, line + '\n', 'utf-8');
      }
    } finally {
      this.flushing = false;
    }
  }

  private ensureDirectory(): void {
    if (this.dirEnsured) return;
    const dir = path.dirname(this.logPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    this.dirEnsured = true;
  }
}
