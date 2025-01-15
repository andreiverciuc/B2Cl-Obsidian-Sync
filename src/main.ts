import { Plugin, Notice, TFile, Modal } from 'obsidian';
import { B2SyncSettings, DEFAULT_SETTINGS } from './types/settings';
import { SyncModal } from './modals/SyncModal';
import { B2SyncSettingsTab } from './settings/SettingsTab';
import { SyncService } from './services/SyncService';
import { NetworkService } from './services/NetworkService';
import { LogService } from './services/LogService';
import { SyncStatistics, SyncAction, FileMetadata } from './types/sync';
import { SyncStatsModal } from './modals/SyncStatsModal';
import { SyncLogsModal } from './modals/SyncLogsModal';
import { DeletedFilesModal } from './modals/DeletedFilesModal';

export default class B2SyncPlugin extends Plugin {
    settings: B2SyncSettings;
    private syncService: SyncService;
    private logService: LogService;
    private currentStats: SyncStatistics;

    async onload() {
        await this.loadSettings();

        // Ensure logging settings are properly set
        if (this.settings.logging.logToFile && !this.settings.logging.logFilePath) {
            this.settings.logging.logFilePath = '.obsidian/plugins/b2cl-sync/sync.log';
            await this.saveSettings();
        }

        // Initialize services
        this.networkService = new NetworkService();
        this.syncService = new SyncService(this.app.vault, this.settings.syncState);
        this.logService = new LogService(this.settings.logging, this.app.vault);
        await this.logService.initLogger();

        // Add ribbon icons
        this.addRibbonIcon('sync', 'B2 Sync', (evt: MouseEvent) => {
            new SyncModal(this.app, this).open();
        });

        this.addRibbonIcon('list-checks', 'Sync Logs', () => {
            new SyncLogsModal(this.app, this.logService).open();
        });

        this.addSettingTab(new B2SyncSettingsTab(this.app, this));
    }

    async onunload() {
        if (this.logService) {
            await this.logService.cleanup();
        }
    }

    async syncToB2() {
        try {
            this.initializeStats();
            new Notice('Starting sync to B2...');

            if (!this.settings.bucketId || !this.settings.applicationKeyId || !this.settings.applicationKey) {
                throw new Error('B2 credentials not configured');
            }

            // Authorize with retry
            const authResponse = await this.networkService.request({
                url: 'https://api.backblazeb2.com/b2api/v2/b2_authorize_account',
                method: 'GET',
                headers: {
                    'Authorization': 'Basic ' + btoa(`${this.settings.applicationKeyId}:${this.settings.applicationKey}`),
                    'Content-Type': 'application/json'
                }
            });

            if (authResponse.status !== 200) {
                throw new Error('Failed to authorize with B2: ' + authResponse.text);
            }

            const auth = authResponse.json;

            let localFiles = this.app.vault.getFiles();
            let remoteFiles = await this.getRemoteFiles(auth);
            
            // Find files that exist remotely but not locally
            const deletedLocally = remoteFiles.filter(remote => 
                !localFiles.some(local => local.path === remote.path)
            );

            if (deletedLocally.length > 0) {
                await new Promise<void>((resolve) => {
                    new DeletedFilesModal(
                        this.app,
                        deletedLocally,
                        async (choices) => {
                            try {
                                for (const choice of choices) {
                                    try {
                                        if (choice.action === 'delete') {
                                            await this.handleDelete(choice.file.path);
                                            // Remove from remoteFiles to prevent re-processing
                                            remoteFiles = remoteFiles.filter(f => f.path !== choice.file.path);
                                        } else if (choice.action === 'download') {
                                            await this.handleDownload(choice.file.path, auth);
                                            const downloadedFile = this.app.vault.getAbstractFileByPath(choice.file.path) as TFile;
                                            if (downloadedFile) {
                                                localFiles.push(downloadedFile);
                                            }
                                        }
                                        // Skip action: do nothing, but remove from remoteFiles
                                        if (choice.action === 'skip') {
                                            remoteFiles = remoteFiles.filter(f => f.path !== choice.file.path);
                                        }
                                    } catch (error) {
                                        new Notice(`Failed to process ${choice.file.path}: ${error.message}`);
                                    }
                                }
                            } finally {
                                resolve();
                            }
                        }
                    ).open();
                });
            }

            // Get fresh list of local files after potential downloads
            localFiles = this.app.vault.getFiles();

            // Remove any files that were deleted or skipped from the comparison
            const filesToSync = remoteFiles.filter(remote => 
                !deletedLocally.some(deleted => 
                    deleted.path === remote.path
                )
            );

            // Continue with normal sync process using filtered files
            const actions = await this.syncService.compareWithRemote(localFiles, filesToSync);
            
            if (actions.length === 0) {
                new Notice('Everything is up to date');
                return;
            }

            await this.processSyncActions(actions, auth);

            if (this.settings.showSyncStats) {
                this.currentStats.endTime = Date.now();
                new SyncStatsModal(this.app, this.currentStats).open();
            }

            this.settings.syncState.lastSync = Date.now();
            await this.saveSettings();
            
            new Notice('Sync completed successfully');
        } catch (error) {
            await this.logService.log('sync', '', 'error', error.message);
            new Notice(`Sync failed: ${error.message}`);
            throw error;
        }
    }

    private async processSyncActions(actions: SyncAction[], auth: any) {
        const failures: Array<{path: string, error: string}> = [];

        try {
            for (const action of actions) {
                try {
                    await this.processSingleAction(action, auth);
                    
                    // Log success
                    await this.logService.log('sync', action.path, 'success');
                } catch (error) {
                    failures.push({
                        path: action.path,
                        error: error.message
                    });
                    
                    // Log error
                    await this.logService.log('sync', action.path, 'error', error.message);
                }
            }

            if (failures.length > 0) {
                this.showFailedFilesModal(failures);
            }
        } catch (error) {
            throw error;
        }
    }

    private async showFailedFilesModal(failures: Array<{path: string, error: string}>) {
        const modal = new Modal(this.app);
        modal.titleEl.setText('Failed Files');
        
        const content = modal.contentEl;
        content.createEl('p', {
            text: `${failures.length} files failed to sync:`
        });

        const list = content.createEl('div', { cls: 'sync-failures-list' });
        failures.forEach(({path, error}) => {
            const item = list.createDiv({ cls: 'sync-failure-item' });
            item.createEl('div', { text: path, cls: 'sync-failure-path' });
            item.createEl('div', { text: error, cls: 'sync-failure-error' });
        });

        const buttonContainer = content.createDiv({ cls: 'sync-modal-buttons' });
        
        const retryButton = buttonContainer.createEl('button', {
            text: 'Retry Failed Files',
            cls: 'mod-cta'
        });

        retryButton.onclick = async () => {
            modal.close();
            await this.retryFailedFiles(failures.map(f => f.path));
        };

        modal.open();
    }

    private async retryFailedFiles(files: string[]) {
        // Create actions for failed files
        const actions = files.map(path => ({ type: 'upload' as const, path }));
        
        // Get fresh auth token
        const auth = await this.authorize();
        
        // Process just the failed files
        await this.processSyncActions(actions, auth);
    }

    private async processSingleAction(action: SyncAction, auth: any) {
        try {
            switch (action.type) {
                case 'upload':
                    await this.handleUpload(action.path, auth);
                    this.currentStats.filesUploaded++;
                    break;
                case 'download':
                    await this.handleDownload(action.path, auth);
                    this.currentStats.filesDownloaded++;
                    break;
                case 'delete':
                    await this.handleDelete(action.path);
                    // Note: filesDeleted is now incremented in handleDelete
                    break;
            }
            this.currentStats.filesProcessed++;
        } catch (error) {
            throw error;
        }
    }

    private initializeStats() {
        this.currentStats = {
            filesProcessed: 0,
            filesUploaded: 0,
            filesDownloaded: 0,
            filesDeleted: 0,
            totalBytes: 0,
            startTime: Date.now()
        };
    }

    private async authorize(): Promise<any> {
        const authResponse = await this.networkService.request({
            url: 'https://api.backblazeb2.com/b2api/v2/b2_authorize_account',
            method: 'GET',
            headers: {
                'Authorization': 'Basic ' + btoa(`${this.settings.applicationKeyId}:${this.settings.applicationKey}`),
                'Content-Type': 'application/json'
            }
        });

        if (authResponse.status !== 200) {
            throw new Error('Failed to authorize with B2: ' + authResponse.text);
        }

        return authResponse.json;
    }

    async downloadFromB2() {
        try {
            new Notice('Starting download from B2...');

            if (!this.settings.bucketId || !this.settings.applicationKeyId || !this.settings.applicationKey) {
                throw new Error('B2 credentials not configured');
            }

            const auth = await this.authorize();
            const remoteFiles = await this.getRemoteFiles(auth);

            for (const file of remoteFiles) {
                try {
                    const content = await this.downloadFileContent(file.path, auth);
                    await this.app.vault.adapter.write(file.path, content);
                    new Notice(`Downloaded: ${file.path}`);
                } catch (error) {
                    new Notice(`Failed to download ${file.path}: ${error.message}`);
                }
            }

            this.settings.lastSync = new Date().toISOString();
            await this.saveSettings();
            
            new Notice('Download completed successfully');
        } catch (error) {
            new Notice(`Download failed: ${error.message}`);
            throw error;
        }
    }

    async uploadToB2() {
        try {
            new Notice('Starting upload to B2...');

            if (!this.settings.bucketId || !this.settings.applicationKeyId || !this.settings.applicationKey) {
                throw new Error('B2 credentials not configured');
            }

            const auth = await this.authorize();
            const files = this.app.vault.getFiles().filter(file => file.extension === 'md');

            for (const file of files) {
                try {
                    await this.handleUpload(file.path, auth);
                    new Notice(`Uploaded: ${file.path}`);
                } catch (error) {
                    new Notice(`Failed to upload ${file.path}: ${error.message}`);
                }
            }

            this.settings.lastSync = new Date().toISOString();
            await this.saveSettings();
            
            new Notice('Upload completed successfully');
        } catch (error) {
            new Notice(`Upload failed: ${error.message}`);
            throw error;
        }
    }

    async listAllFiles() {
        try {
            if (!this.settings.bucketId || !this.settings.applicationKeyId || !this.settings.applicationKey) {
                throw new Error('B2 credentials not configured');
            }

            const auth = await this.authorize();
            const listFilesResponse = await this.networkService.request({
                url: `${auth.apiUrl}/b2api/v2/b2_list_file_names`,
                method: 'POST',
                headers: {
                    'Authorization': auth.authorizationToken,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    bucketId: this.settings.bucketId,
                    maxFileCount: 1000
                })
            });

            return listFilesResponse.json.files.map((file: any) => ({
                fileName: file.fileName,
                uploadTimestamp: file.uploadTimestamp,
                size: file.contentLength
            }));
        } catch (error) {
            new Notice(`Failed to list files: ${error.message}`);
            throw error;
        }
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    private async handleUpload(path: string, auth: any): Promise<void> {
        const file = this.app.vault.getAbstractFileByPath(path) as TFile;
        const content = await this.app.vault.read(file);

        const uploadUrlResponse = await this.networkService.request({
            url: `${auth.apiUrl}/b2api/v2/b2_get_upload_url`,
            method: 'POST',
            headers: {
                'Authorization': auth.authorizationToken,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                bucketId: this.settings.bucketId
            })
        });

        const uploadUrl = uploadUrlResponse.json;
        const uploadResponse = await this.networkService.request({
            url: uploadUrl.uploadUrl,
            method: 'POST',
            headers: {
                'Authorization': uploadUrl.authorizationToken,
                'X-Bz-File-Name': encodeURIComponent(path),
                'Content-Type': 'text/markdown',
                'X-Bz-Content-Sha1': 'do_not_verify'
            },
            body: content
        });

        // Update the file's mtime by rewriting it
        await this.app.vault.modify(file, content);

        this.currentStats.totalBytes += content.length;
    }

    private async handleDownload(path: string, auth: any): Promise<void> {
        const content = await this.downloadFileContent(path, auth);
        await this.app.vault.adapter.write(path, content);
        this.currentStats.totalBytes += content.length;
    }

    private async handleDelete(path: string): Promise<void> {
        try {
            const auth = await this.authorize();
            
            // First, list all versions of the file
            const listVersionsResponse = await this.networkService.request({
                url: `${auth.apiUrl}/b2api/v2/b2_list_file_versions`,
                method: 'POST',
                headers: {
                    'Authorization': auth.authorizationToken,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    bucketId: this.settings.bucketId,
                    startFileName: path,
                    prefix: path
                })
            });

            const files = listVersionsResponse.json.files;
            if (!files || files.length === 0) {
                throw new Error(`File ${path} not found in B2`);
            }

            // Delete each version of the file
            for (const file of files) {
                if (file.fileName === path) {  // Exact match only
                    await this.networkService.request({
                        url: `${auth.apiUrl}/b2api/v2/b2_delete_file_version`,
                        method: 'POST',
                        headers: {
                            'Authorization': auth.authorizationToken,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            fileId: file.fileId,
                            fileName: path
                        })
                    });
                }
            }

            // Verify deletion
            const verifyResponse = await this.networkService.request({
                url: `${auth.apiUrl}/b2api/v2/b2_list_file_versions`,
                method: 'POST',
                headers: {
                    'Authorization': auth.authorizationToken,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    bucketId: this.settings.bucketId,
                    startFileName: path,
                    prefix: path
                })
            });

            const remainingFiles = verifyResponse.json.files;
            if (remainingFiles && remainingFiles.some(f => f.fileName === path)) {
                throw new Error(`Failed to delete all versions of ${path}`);
            }

            // Update statistics and log
            this.currentStats.filesDeleted++;
            await this.logService.log('delete', path, 'success');

            // Update sync state
            if (this.settings.syncState.files[path]) {
                delete this.settings.syncState.files[path];
                await this.saveSettings();
            }

            new Notice(`Deleted ${path} from B2`);
        } catch (error) {
            console.error('Delete error:', error);
            new Notice(`Failed to delete ${path}: ${error.message}`);
            await this.logService.log('delete', path, 'error', error.message);
            throw error;
        }
    }

    private async downloadFileContent(path: string, auth: any): Promise<string> {
        const downloadResponse = await this.networkService.request({
            url: `${auth.downloadUrl}/file/${this.settings.bucketName}/${encodeURIComponent(path)}`,
            method: 'GET',
            headers: {
                'Authorization': auth.authorizationToken
            }
        });

        if (downloadResponse.status !== 200) {
            throw new Error('Failed to download file: ' + downloadResponse.text);
        }

        return downloadResponse.text;
    }

    private async getRemoteFiles(auth: any): Promise<FileMetadata[]> {
        const listFilesResponse = await this.networkService.request({
            url: `${auth.apiUrl}/b2api/v2/b2_list_file_names`,
            method: 'POST',
            headers: {
                'Authorization': auth.authorizationToken,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                bucketId: this.settings.bucketId,
                maxFileCount: 1000
            })
        });

        return listFilesResponse.json.files.map((file: any) => ({
            path: file.fileName,
            hash: file.contentSha1,
            modifiedTime: file.uploadTimestamp,
            size: file.contentLength,
            deleted: false
        }));
    }
}

export type { B2SyncPlugin }; 