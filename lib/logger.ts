/**
 * Centralized logging utility
 * In production, logs only errors. In development, logs everything.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const isDevelopment = process.env.NODE_ENV === 'development'

class Logger {
  private shouldLog(level: LogLevel): boolean {
    if (isDevelopment) return true
    // In production, only log warnings and errors
    return level === 'warn' || level === 'error'
  }

  debug(message: string, ...args: any[]) {
    if (this.shouldLog('debug')) {
      console.debug(`[DEBUG] ${message}`, ...args)
    }
  }

  info(message: string, ...args: any[]) {
    if (this.shouldLog('info')) {
      console.info(`[INFO] ${message}`, ...args)
    }
  }

  warn(message: string, ...args: any[]) {
    if (this.shouldLog('warn')) {
      console.warn(`[WARN] ${message}`, ...args)
    }
  }

  error(message: string, error?: Error | unknown, ...args: any[]) {
    if (this.shouldLog('error')) {
      console.error(`[ERROR] ${message}`, error, ...args)

      // In production, you could send to error tracking service here
      // Example: Sentry.captureException(error)
    }
  }
}

export const logger = new Logger()
