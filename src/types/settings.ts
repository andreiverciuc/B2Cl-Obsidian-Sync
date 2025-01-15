import { SyncState } from './sync';

export interface LoggingSettings {
    enabled: boolean;
    maxEntries: number;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    includeTimestamps: boolean;
    logToFile: boolean;
    logFilePath?: string;
}

export interface B2SyncSettings {
    bucketId: string;
    applicationKeyId: string;
    applicationKey: string;
    bucketName: string;
    lastSync: string;
    syncState: SyncState;
    logging: LoggingSettings;
    showSyncStats: boolean;
}

export const DEFAULT_SETTINGS: B2SyncSettings = {
    bucketId: '',
    applicationKeyId: '',
    applicationKey: '',
    bucketName: '',
    lastSync: '',
    syncState: {
        lastSync: 0,
        files: {}
    },
    logging: {
        enabled: true,
        maxEntries: 1000,
        logLevel: 'info',
        includeTimestamps: true,
        logToFile: true,
        logFilePath: '.obsidian/plugins/b2cl-sync/sync.log'
    },
    showSyncStats: true,
} 