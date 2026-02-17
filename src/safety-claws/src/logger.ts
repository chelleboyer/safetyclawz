/**
 * SafetyClawz Debug Logger
 * 
 * Color-coded console output for observability during testing
 */

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
};

interface LogContext {
  toolName?: string;
  command?: string;
  reason?: string;
  duration?: number;
  [key: string]: any;
}

export class SafetyClawzLogger {
  private verbose: boolean;

  constructor(verbose = process.env.SAFETYCLAWZ_DEBUG === 'true') {
    this.verbose = verbose;
  }

  /**
   * Log policy evaluation start
   */
  evaluating(toolName: string, command: string) {
    if (!this.verbose) return;
    
    const timestamp = new Date().toISOString().substring(11, 23); // HH:MM:SS.mmm
    console.log(
      `${colors.gray}[${timestamp}]${colors.reset} ${colors.cyan}⚡ EVALUATING${colors.reset} ${colors.bright}${toolName}${colors.reset}`
    );
    console.log(`${colors.gray}   Command: ${colors.dim}${command.substring(0, 80)}${colors.reset}`);
  }

  /**
   * Log BLOCK decision (always visible)
   */
  blocked(toolName: string, reason: string, context?: LogContext) {
    const timestamp = new Date().toISOString().substring(11, 23);
    console.log(
      `${colors.gray}[${timestamp}]${colors.reset} ${colors.red}${colors.bright}🛑 BLOCKED${colors.reset} ${colors.bright}${toolName}${colors.reset}`
    );
    console.log(`${colors.red}   Reason: ${reason}${colors.reset}`);
    
    if (this.verbose && context) {
      console.log(`${colors.gray}   Context: ${JSON.stringify(context)}${colors.reset}`);
    }
  }

  /**
   * Log ALLOW decision
   */
  allowed(toolName: string, command?: string, context?: LogContext) {
    if (!this.verbose) return;
    
    const timestamp = new Date().toISOString().substring(11, 23);
    console.log(
      `${colors.gray}[${timestamp}]${colors.reset} ${colors.green}${colors.bright}✅ ALLOWED${colors.reset} ${colors.bright}${toolName}${colors.reset}`
    );
    
    if (command) {
      console.log(`${colors.gray}   Command: ${colors.dim}${command.substring(0, 80)}${colors.reset}`);
    }
  }

  /**
   * Log policy check details
   */
  checkingRule(ruleName: string, pattern: string, matched: boolean) {
    if (!this.verbose) return;
    
    const icon = matched ? '❌' : '○';
    const color = matched ? colors.red : colors.gray;
    console.log(`${color}   ${icon} Rule: ${ruleName} → Pattern: "${pattern}"${colors.reset}`);
  }

  /**
   * Log audit trail entry
   */
  audit(toolName: string, success: boolean, duration?: number) {
    if (!this.verbose) return;
    
    const timestamp = new Date().toISOString().substring(11, 23);
    const statusIcon = success ? '📝' : '⚠️';
    const statusColor = success ? colors.blue : colors.yellow;
    
    console.log(
      `${colors.gray}[${timestamp}]${colors.reset} ${statusColor}${statusIcon} AUDIT${colors.reset} ${toolName}${duration ? ` (${duration}ms)` : ''}`
    );
  }

  /**
   * Log plugin initialization
   */
  init(policyPath: string, stats: { blockedCommands: number; blockedPaths: number }) {
    console.log(`\n${colors.bright}${colors.magenta}🛡️  SafetyClawz Prototype v0.1.0${colors.reset}`);
    console.log(`${colors.gray}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log(`${colors.cyan}Policy:${colors.reset} ${policyPath}`);
    console.log(`${colors.cyan}Rules:${colors.reset}  ${stats.blockedCommands} blocked commands, ${stats.blockedPaths} blocked paths`);
    console.log(`${colors.cyan}Debug:${colors.reset}  ${this.verbose ? colors.green + 'ENABLED' : colors.gray + 'DISABLED'} ${colors.gray}(set SAFETYCLAWZ_DEBUG=true for verbose)${colors.reset}`);
    console.log(`${colors.gray}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
  }

  /**
   * Log error
   */
  error(message: string, err?: Error) {
    const timestamp = new Date().toISOString().substring(11, 23);
    console.error(
      `${colors.gray}[${timestamp}]${colors.reset} ${colors.red}${colors.bright}❌ ERROR${colors.reset} ${message}`
    );
    
    if (err && this.verbose) {
      console.error(`${colors.red}${err.stack}${colors.reset}`);
    }
  }

  /**
   * Log warning
   */
  warn(message: string) {
    const timestamp = new Date().toISOString().substring(11, 23);
    console.warn(
      `${colors.gray}[${timestamp}]${colors.reset} ${colors.yellow}⚠️  WARN${colors.reset} ${message}`
    );
  }

  /**
   * Log info (always visible)
   */
  info(message: string) {
    const timestamp = new Date().toISOString().substring(11, 23);
    console.log(
      `${colors.gray}[${timestamp}]${colors.reset} ${colors.blue}ℹ️  INFO${colors.reset} ${message}`
    );
  }

  /**
   * Log debug (only in verbose mode)
   */
  debug(message: string, data?: any) {
    if (!this.verbose) return;
    
    const timestamp = new Date().toISOString().substring(11, 23);
    console.log(
      `${colors.gray}[${timestamp}] 🔍 DEBUG ${message}${colors.reset}`
    );
    
    if (data) {
      console.log(`${colors.gray}   ${JSON.stringify(data, null, 2)}${colors.reset}`);
    }
  }
}

// Singleton instance
export const logger = new SafetyClawzLogger();
