/**
 * Module: Structured Logger Utility
 * Responsibility: Provides standardized timestamped logging across the application
 * without using raw console.log. Manages distinct streams (stdout for info/debug,
 * stderr for warn/error) and renders the highlighted Mock OTP banner for developer testing.
 */

type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private format(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context && Object.keys(context).length > 0 ? ` ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${level}] ${message}${contextStr}\n`;
  }

  public info(message: string, context?: LogContext): void {
    process.stdout.write(this.format('INFO', message, context));
  }

  public warn(message: string, context?: LogContext): void {
    process.stderr.write(this.format('WARN', message, context));
  }

  public error(message: string, context?: LogContext): void {
    process.stderr.write(this.format('ERROR', message, context));
  }

  public debug(message: string, context?: LogContext): void {
    if (process.env.NODE_ENV !== 'production') {
      process.stdout.write(this.format('DEBUG', message, context));
    }
  }

  /**
   * Prominently formats the mock OTP for developer and evaluator inspection.
   * In production this would be replaced with an SMS provider integration (e.g. Twilio).
   */
  public mockOtp(phone: string, otp: string): void {
    const banner = [
      '\n' + '='.repeat(70),
      `🔐 [AUTH MOCK OTP] Phone: ${phone} | OTP: ${otp} | Expires in: 5 minutes`,
      '='.repeat(70) + '\n',
    ].join('\n');
    process.stdout.write(banner);
  }
}

export const logger = new Logger();
