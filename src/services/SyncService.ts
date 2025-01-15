import { TFile, Vault } from 'obsidian';
import { FileMetadata, SyncState, SyncAction } from '../types/sync';
import { createHash } from 'crypto';

export class SyncService {
    constructor(
        private vault: Vault,
        private syncState: SyncState
    ) {}

    async calculateFileHash(file: TFile): Promise<string> {
        const content = await this.vault.read(file);
        return createHash('sha256').update(content).digest('hex');
    }

    async getLocalMetadata(file: TFile): Promise<FileMetadata> {
        return {
            path: file.path,
            hash: await this.calculateFileHash(file),
            modifiedTime: file.stat.mtime,
            size: file.stat.size
        };
    }

    async compareWithRemote(
        localFiles: TFile[],
        remoteFiles: FileMetadata[]
    ): Promise<SyncAction[]> {
        const actions: SyncAction[] = [];
        const remoteFileMap = new Map(remoteFiles.map(f => [f.path, f]));
        const localFileMap = new Map(localFiles.map(f => [f.path, f]));

        for (const file of localFiles) {
            const remoteMeta = remoteFileMap.get(file.path);
            const localMeta = await this.getLocalMetadata(file);
            
            if (!remoteMeta || remoteMeta.hash !== localMeta.hash) {
                actions.push({ type: 'upload', path: file.path });
            }
        }

        for (const [path, _] of remoteFileMap) {
            if (!localFileMap.has(path)) {
                actions.push({ type: 'download', path });
            }
        }

        return actions;
    }
} 