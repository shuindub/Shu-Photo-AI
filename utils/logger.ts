
export type LogLevel = 'info' | 'success' | 'warn' | 'error' | 'debug';

export interface LogEntry {
    id: string;
    timestamp: number;
    level: LogLevel;
    module: string;
    message: string;
    data?: any;
}

type LogListener = (logs: LogEntry[]) => void;

const styles = {
    info: 'color: #3b82f6; font-weight: bold;',
    success: 'color: #22c55e; font-weight: bold;',
    warn: 'color: #f59e0b; font-weight: bold;',
    error: 'color: #ef4444; font-weight: bold;',
    debug: 'color: #8b5cf6; font-weight: bold;',
    module: 'color: #9ca3af; font-weight: normal; font-style: italic; margin-right: 8px;'
};

class LogManager {
    private logs: LogEntry[] = [];
    private listeners: Set<LogListener> = new Set();
    private maxLogs = 1000;

    private notify() {
        // Notify all listeners with a copy of the logs
        const currentLogs = [...this.logs];
        this.listeners.forEach(listener => listener(currentLogs));
    }

    private addLog(level: LogLevel, module: string, message: string, data?: any) {
        const entry: LogEntry = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            timestamp: Date.now(),
            level,
            module,
            message,
            data
        };
        
        this.logs.unshift(entry); // Add to beginning (newest first)
        
        if (this.logs.length > this.maxLogs) {
            this.logs.pop();
        }
        
        // Console output (preserve browser devtools styling)
        const style = styles[level] || styles.info;
        const consoleMethod = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
        
        if (data !== undefined) {
             consoleMethod(`%c[${module}]%c${message}`, styles.module, style, data);
        } else {
             consoleMethod(`%c[${module}]%c${message}`, styles.module, style);
        }

        this.notify();
    }

    public info(module: string, message: string, data?: any) {
        this.addLog('info', module, message, data);
    }

    public success(module: string, message: string, data?: any) {
        this.addLog('success', module, message, data);
    }

    public warn(module: string, message: string, data?: any) {
        this.addLog('warn', module, message, data);
    }

    public error(module: string, message: string, error?: any) {
        this.addLog('error', module, message, error);
    }

    public debug(module: string, message: string, data?: any) {
        // Always log debug to internal store, but only console if dev
        if (process.env.NODE_ENV === 'development') {
             this.addLog('debug', module, message, data);
        } else {
            // Still add to internal logs for the viewer even in prod if needed, 
            // or comment out the next line to disable debug logs in prod completely.
            this.addLog('debug', module, message, data); 
        }
    }

    public getLogs() {
        return [...this.logs];
    }

    public clearLogs() {
        this.logs = [];
        this.notify();
    }

    public subscribe(listener: LogListener) {
        this.listeners.add(listener);
        listener([...this.logs]); // Initial call
        return () => {
            this.listeners.delete(listener);
        };
    }
}

export const Logger = new LogManager();
