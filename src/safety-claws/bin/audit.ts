#!/usr/bin/env node
/**
 * SafetyClawz Audit Log Viewer
 * 
 * Usage:
 *   safetyclawz-audit --tail         # Follow audit log in real-time
 *   safetyclawz-audit --blocked      # Show only blocked actions
 *   safetyclawz-audit --last 10      # Show last 10 entries
 */

import fs from 'node:fs';
import path from 'node:path';
import { Tail } from 'tail';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
};

interface AuditEntry {
  timestamp: string;
  event: 'policy_check' | 'tool_execution';
  toolName: string;
  params: any;
  decision?: {
    decision: 'ALLOW' | 'BLOCK';
    reason: string;
    triggered_rule?: string;
  };
  durationMs?: number;
  success?: boolean;
  error?: string;
}

function formatEntry(entry: AuditEntry): string {
  const timestamp = new Date(entry.timestamp).toISOString().substring(11, 23);
  
  if (entry.event === 'policy_check') {
    const isBlocked = entry.decision?.decision === 'BLOCK';
    const icon = isBlocked ? '🛑' : '✅';
    const color = isBlocked ? colors.red : colors.green;
    const status = isBlocked ? 'BLOCKED' : 'ALLOWED';
    
    let output = `${colors.gray}[${timestamp}]${colors.reset} ${color}${colors.bright}${icon} ${status}${colors.reset} ${entry.toolName}\n`;
    
    if (entry.params?.command) {
      output += `${colors.gray}   Command: ${entry.params.command}${colors.reset}\n`;
    }
    
    if (entry.decision?.reason) {
      output += `${colors.gray}   Reason: ${color}${entry.decision.reason}${colors.reset}\n`;
    }
    
    if (entry.decision?.triggered_rule) {
      output += `${colors.gray}   Rule: ${entry.decision.triggered_rule}${colors.reset}\n`;
    }
    
    if (entry.durationMs !== undefined) {
      output += `${colors.gray}   Duration: ${entry.durationMs}ms${colors.reset}\n`;
    }
    
    return output;
  }
  
  if (entry.event === 'tool_execution') {
    const icon = entry.success ? '📝' : '⚠️';
    const color = entry.success ? colors.blue : colors.yellow;
    
    let output = `${colors.gray}[${timestamp}]${colors.reset} ${color}${icon} EXECUTED${colors.reset} ${entry.toolName}`;
    
    if (entry.durationMs) {
      output += ` ${colors.gray}(${entry.durationMs}ms)${colors.reset}`;
    }
    
    output += '\n';
    
    if (entry.error) {
      output += `${colors.red}   Error: ${entry.error}${colors.reset}\n`;
    }
    
    return output;
  }
  
  return `${colors.gray}[${timestamp}] ${JSON.stringify(entry)}${colors.reset}\n`;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    tail: args.includes('--tail'),
    blocked: args.includes('--blocked'),
    last: 0,
  };
  
  const lastIndex = args.indexOf('--last');
  if (lastIndex !== -1 && args[lastIndex + 1]) {
    options.last = parseInt(args[lastIndex + 1], 10);
  }
  
  return options;
}

function getAuditLogPath(): string {
  const home = process.env.HOME || process.env.USERPROFILE || '';
  return path.join(home, '.safetyclawz', 'audit.jsonl');
}

function tailLog(logPath: string, options: { blocked: boolean }) {
  console.log(`${colors.bright}${colors.blue}📡 Tailing audit log: ${logPath}${colors.reset}\n`);
  console.log(`${colors.gray}Press Ctrl+C to stop${colors.reset}\n`);
  
  const tail = new Tail(logPath, {
    fromBeginning: false,
    follow: true,
    useWatchFile: true,
  });
  
  tail.on('line', (line: string) => {
    try {
      const entry: AuditEntry = JSON.parse(line);
      
      // Filter if needed
      if (options.blocked && entry.decision?.decision !== 'BLOCK') {
        return;
      }
      
      process.stdout.write(formatEntry(entry));
    } catch (err) {
      console.error(`${colors.red}Failed to parse line: ${line}${colors.reset}`);
    }
  });
  
  tail.on('error', (err: Error) => {
    console.error(`${colors.red}Tail error: ${err.message}${colors.reset}`);
  });
}

function showLast(logPath: string, count: number, options: { blocked: boolean }) {
  if (!fs.existsSync(logPath)) {
    console.error(`${colors.red}Audit log not found: ${logPath}${colors.reset}`);
    process.exit(1);
  }
  
  const content = fs.readFileSync(logPath, 'utf-8');
  const lines = content.trim().split('\n').filter(Boolean);
  
  let entries: AuditEntry[] = lines.map(line => {
    try {
      return JSON.parse(line);
    } catch {
      return null;
    }
  }).filter(Boolean) as AuditEntry[];
  
  // Filter if needed
  if (options.blocked) {
    entries = entries.filter(e => e.decision?.decision === 'BLOCK');
  }
  
  // Take last N
  const lastN = entries.slice(-count);
  
  console.log(`${colors.bright}${colors.blue}📋 Last ${lastN.length} entries:${colors.reset}\n`);
  
  lastN.forEach(entry => {
    process.stdout.write(formatEntry(entry));
  });
}

function main() {
  const options = parseArgs();
  const logPath = getAuditLogPath();
  
  if (options.tail) {
    tailLog(logPath, options);
  } else if (options.last > 0) {
    showLast(logPath, options.last, options);
  } else {
    // Show help
    console.log(`${colors.bright}SafetyClawz Audit Log Viewer${colors.reset}\n`);
    console.log('Usage:');
    console.log('  safetyclawz-audit --tail          Follow audit log in real-time');
    console.log('  safetyclawz-audit --last 10       Show last 10 entries');
    console.log('  safetyclawz-audit --blocked       Filter blocked actions only\n');
    console.log('Examples:');
    console.log('  safetyclawz-audit --tail --blocked    Watch for blocked actions');
    console.log('  safetyclawz-audit --last 20           Show recent audit history\n');
    console.log(`Log file: ${logPath}`);
  }
}

main();
