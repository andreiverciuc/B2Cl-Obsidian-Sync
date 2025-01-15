import { App, Modal } from 'obsidian';
import type { B2SyncPlugin } from '../main';
import { BucketFilesModal } from './BucketFilesModal';

export class SyncModal extends Modal {
    plugin: B2SyncPlugin;

    constructor(app: App, plugin: B2SyncPlugin) {
        super(app);
        this.plugin = plugin;
    }

    onOpen() {
        const {contentEl} = this;
        
        contentEl.createEl('h2', {text: 'B2 Sync'});

        const statusContainer = contentEl.createDiv({ cls: 'sync-modal-status' });
        
        if (this.plugin.settings.lastSync) {
            statusContainer.createEl('p', {
                text: `Last sync: ${new Date(this.plugin.settings.lastSync).toLocaleString()}`
            });
        } else {
            statusContainer.createEl('p', {text: 'No previous sync'});
        }

        const infoContainer = contentEl.createDiv({ cls: 'sync-modal-info' });
        infoContainer.createEl('p', {
            text: 'This will sync your vault with Backblaze B2 storage.'
        });

        const buttonContainer = contentEl.createDiv({ cls: 'sync-modal-buttons' });
        
        const syncButton = buttonContainer.createEl('button', {
            text: 'Sync to B2',
            cls: 'mod-cta'
        });

        const downloadButton = buttonContainer.createEl('button', {
            text: 'Download from B2',
            cls: 'mod-cta'
        });

        const listFilesButton = buttonContainer.createEl('button', {
            text: 'List Bucket Files',
            cls: 'mod-cta'
        });

        syncButton.onclick = async () => {
            syncButton.disabled = true;
            syncButton.setText('Syncing...');
            try {
                await this.plugin.syncToB2();
                this.close();
            } catch (error) {
                syncButton.disabled = false;
                syncButton.setText('Sync to B2');
            }
        };

        downloadButton.onclick = async () => {
            downloadButton.disabled = true;
            downloadButton.setText('Downloading...');
            try {
                await this.plugin.downloadFromB2();
                this.close();
            } catch (error) {
                downloadButton.disabled = false;
                downloadButton.setText('Download from B2');
            }
        };

        listFilesButton.onclick = () => {
            new BucketFilesModal(this.app, this.plugin).open();
        };
    }

    onClose() {
        const {contentEl} = this;
        contentEl.empty();
    }
} 