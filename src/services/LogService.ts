import { Vault } from 'obsidian';
import { LoggingSettings } from '../types/settings';
import * as winston from 'winston';
import { join } from 'path';

export interface SyncLogEntry {
    timestamp: number;
    action: string;
    path: string;
    status: 'success' | 'error';
    error?: string;
    level: 'debug' | 'info' | 'warn' | 'error';
}

export class LogService {
    private logger: winston.Logger;

    constructor(private settings: LoggingSettings, private vault: Vault) {
        this.initLogger();
    }

    private async ensureLogDirectory(): Promise<string | null> {
        if (!this.settings.logToFile || !this.settings.logFilePath) {
            return null;
        }

        try {
            const dirPath = this.settings.logFilePath.split('/').slice(0, -1).join('/');
            if (dirPath) {
                const exists = await this.vault.adapter.exists(dirPath);
                if (!exists) {
                    await this.vault.adapter.mkdir(dirPath);
                }
            }

            return join(this.vault.adapter.getBasePath(), this.settings.logFilePath);
        } catch (error) {
            console.error('Failed to create log directory:', error);
            this.settings.logToFile = false;
            return null;
        }
    }

    private async initLogger() {
        const logPath = await this.ensureLogDirectory();

        const format = winston.format.printf(({ timestamp, level, message }) => {
            return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
        });

        const options: winston.LoggerOptions = {
            level: this.settings.logLevel,
            format: winston.format.combine(
                winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                format
            ),
            transports: [
                new winston.transports.Console()
            ]
        };

        if (logPath) {
            options.transports?.push(
                new winston.transports.File({
                    filename: logPath,
                    maxsize: 5 * 1024 * 1024,
                    maxFiles: 1,
                    tailable: true
                })
            );
        }

        if (this.logger) {
            this.logger.close();
        }
        
        this.logger = winston.createLogger(options);
    }

    async log(action: string, path: string, status: 'success' | 'error', error?: string) {
        if (!this.settings.enabled) return;

        const level = status === 'error' ? 'error' : 'info';
        const message = `${status === 'success' ? '✓' : '✗'} ${action}: ${path}${
            error ? ` (${error})` : ''
        }`;

        this.logger.log(level, message);
    }

    async getRecentLogs(): Promise<string[]> {
        if (!this.settings.logToFile || !this.settings.logFilePath) {
            return [];
        }

        try {
            const logPath = join(this.vault.adapter.getBasePath(), this.settings.logFilePath);
            const content = await this.vault.adapter.read(logPath);
            return content.split('\n').filter(line => line.length > 0);
        } catch (error) {
            console.error('Failed to read logs:', error);
            return [];
        }
    }

    async clearLogs() {
        if (this.settings.logToFile && this.settings.logFilePath) {
            const logPath = join(this.vault.adapter.getBasePath(), this.settings.logFilePath);
            await this.vault.adapter.write(logPath, '');
            await this.initLogger(); // Reinitialize logger after clearing
        }
    }

    async cleanup() {
        if (this.logger) {
            this.logger.close();
        }
    }

    async updateSettings(settings: LoggingSettings) {
        this.settings = settings;
        await this.initLogger();
    }
}