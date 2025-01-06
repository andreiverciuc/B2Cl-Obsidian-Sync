import { App, Modal, requestUrl } from 'obsidian';
import type { B2SyncPlugin } from '../main';
import { FileContentModal } from './FileContentModal';

export class BucketFilesModal extends Modal {
    plugin: B2SyncPlugin;

    constructor(app: App, plugin: B2SyncPlugin) {
        super(app);
        this.plugin = plugin;
    }

    async onOpen() {
        const {contentEl} = this;
        contentEl.createEl('h2', {text: 'B2 Bucket Files'});

        try {
            const loadingEl = contentEl.createEl('p', {text: 'Loading files...'});

            const authResponse = await requestUrl({
                url: 'https://api.backblazeb2.com/b2api/v2/b2_authorize_account',
                method: 'GET',
                headers: {
                    'Authorization': 'Basic ' + btoa(`${this.plugin.settings.applicationKeyId}:${this.plugin.settings.applicationKey}`),
                    'Content-Type': 'application/json'
                }
            });

            if (authResponse.status !== 200) {
                throw new Error('Failed to authorize with B2: ' + authResponse.text);
            }

            const auth = authResponse.json;

            const listFilesResponse = await requestUrl({
                url: `${auth.apiUrl}/b2api/v2/b2_list_file_names`,
                method: 'POST',
                headers: {
                    'Authorization': auth.authorizationToken,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    bucketId: this.plugin.settings.bucketId,
                    maxFileCount: 1000
                })
            });

            if (listFilesResponse.status !== 200) {
                throw new Error('Failed to list files: ' + listFilesResponse.text);
            }

            loadingEl.remove();

            const files = listFilesResponse.json.files;
            const fileList = contentEl.createEl('div', { cls: 'bucket-file-list' });

            if (files.length === 0) {
                fileList.createEl('p', { text: 'No files found in bucket' });
            } else {
                const table = fileList.createEl('table');
                const header = table.createEl('tr');
                header.createEl('th', { text: 'File Name' });
                header.createEl('th', { text: 'Size' });
                header.createEl('th', { text: 'Last Modified' });

                files.forEach((file: any) => {
                    const row = table.createEl('tr', { cls: 'clickable-row' });
                    row.createEl('td', { text: file.fileName });
                    row.createEl('td', { text: this.formatBytes(file.contentLength) });
                    row.createEl('td', { text: new Date(file.uploadTimestamp).toLocaleString() });
                    
                    row.addEventListener('click', () => {
                        new FileContentModal(this.app, file.fileName, auth, this.plugin).open();
                    });
                });
            }
        } catch (error) {
            contentEl.empty();
            contentEl.createEl('h2', {text: 'Error Loading Files'});
            contentEl.createEl('p', {text: error.message, cls: 'bucket-files-error'});
        }
    }

    formatBytes(bytes: number): string {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    onClose() {
        const {contentEl} = this;
        contentEl.empty();
    }
} 