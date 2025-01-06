import { App, Modal, requestUrl } from 'obsidian';
import type { B2SyncPlugin } from '../main';

export class FileContentModal extends Modal {
    constructor(app: App, private fileName: string, private auth: any, private plugin: B2SyncPlugin) {
        super(app);
    }

    async onOpen() {
        const {contentEl} = this;
        contentEl.createEl('h2', {text: this.fileName});
        
        try {
            const loadingEl = contentEl.createEl('p', {text: 'Loading content...'});

            const downloadResponse = await requestUrl({
                url: `${this.auth.downloadUrl}/file/${this.plugin.settings.bucketName}/${encodeURIComponent(this.fileName)}`,
                method: 'GET',
                headers: {
                    'Authorization': this.auth.authorizationToken
                }
            });

            if (downloadResponse.status !== 200) {
                throw new Error('Failed to download file: ' + downloadResponse.text);
            }

            loadingEl.remove();

            const contentContainer = contentEl.createDiv({ cls: 'file-content' });
            contentContainer.createEl('pre').createEl('code', {
                text: downloadResponse.text
            });

        } catch (error) {
            contentEl.empty();
            contentEl.createEl('h2', {text: 'Error Loading File'});
            contentEl.createEl('p', {text: error.message, cls: 'bucket-files-error'});
            console.error('File download error:', error);
        }
    }

    onClose() {
        const {contentEl} = this;
        contentEl.empty();
    }
} 