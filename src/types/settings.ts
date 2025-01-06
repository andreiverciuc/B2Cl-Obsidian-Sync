export interface B2SyncSettings {
    bucketId: string;
    applicationKeyId: string;
    applicationKey: string;
    bucketName: string;
    syncInterval: number;
    lastSync: string;
    autoSync: boolean;
}

export const DEFAULT_SETTINGS: B2SyncSettings = {
    bucketId: '',
    applicationKeyId: '',
    applicationKey: '',
    bucketName: '',
    syncInterval: 60,
    lastSync: '',
    autoSync: false
} 