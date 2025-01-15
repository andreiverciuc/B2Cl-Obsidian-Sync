export interface FileMetadata {
    path: string;
    hash: string;
    modifiedTime: number;
    size: number;
}

export interface SyncState {
    lastSync: number;
    files: { [path: string]: FileMetadata };
    lastProgress?: SyncProgress;
}

export type SyncAction = {
    type: 'upload' | 'download' | 'delete';
    path: string;
};

export interface SyncStatistics {
    filesProcessed: number;
    filesUploaded: number;
    filesDownloaded: number;
    filesDeleted: number;
    totalBytes: number;
    startTime: number;
    endTime?: number;
} 