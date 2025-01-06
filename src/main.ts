import { Plugin, Notice, requestUrl } from 'obsidian';
import { B2SyncSettings, DEFAULT_SETTINGS } from './types/settings';
import { SyncModal } from './modals/SyncModal';
import { B2SyncSettingsTab } from './settings/SettingsTab';

export default class B2SyncPlugin extends Plugin {
    settings: B2SyncSettings;
    syncIntervalId: number | undefined;

    async onload() {
        await this.loadSettings();

        this.addRibbonIcon('sync', 'B2 Sync', (evt: MouseEvent) => {
            new SyncModal(this.app, this).open();
        });

        this.addSettingTab(new B2SyncSettingsTab(this.app, this));

        if (this.settings.autoSync) {
            this.setupAutoSync();
        }
    }

    onunload() {
        if (this.syncIntervalId) {
            window.clearInterval(this.syncIntervalId);
        }
    }

    setupAutoSync() {
        if (this.syncIntervalId) {
            window.clearInterval(this.syncIntervalId);
        }
        
        if (this.settings.autoSync && this.settings.syncInterval > 0) {
            this.syncIntervalId = window.setInterval(
                () => this.syncToB2(),
                this.settings.syncInterval * 60 * 1000
            );
        }
    }

    async syncToB2() {
        try {
            new Notice('Starting sync to B2...');

            if (!this.settings.bucketId || !this.settings.applicationKeyId || !this.settings.applicationKey) {
                throw new Error('B2 credentials not configured');
            }

            const authResponse = await requestUrl({
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

            const files = this.app.vault.getFiles();
            const markdownFiles = files.filter(file => file.extension === 'md');

            for (const file of markdownFiles) {
                try {
                    const content = await this.app.vault.read(file);

                    const uploadUrlResponse = await requestUrl({
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

                    if (uploadUrlResponse.status !== 200) {
                        throw new Error('Failed to get upload URL: ' + uploadUrlResponse.text);
                    }

                    const uploadUrl = uploadUrlResponse.json;

                    const uploadResponse = await requestUrl({
                        url: uploadUrl.uploadUrl,
                        method: 'POST',
                        headers: {
                            'Authorization': uploadUrl.authorizationToken,
                            'X-Bz-File-Name': encodeURIComponent(file.path),
                            'Content-Type': 'text/markdown',
                            'X-Bz-Content-Sha1': 'do_not_verify'
                        },
                        body: content
                    });

                    if (uploadResponse.status !== 200) {
                        throw new Error('Upload failed: ' + uploadResponse.text);
                    }

                    new Notice(`Synced: ${file.path}`);
                } catch (error) {
                    new Notice(`Failed to sync ${file.path}: ${error.message}`);
                }
            }

            this.settings.lastSync = new Date().toISOString();
            await this.saveSettings();
            
            new Notice('Sync completed successfully');
        } catch (error) {
            new Notice(`Sync failed: ${error.message}`);
            throw error;
        }
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}

export type { B2SyncPlugin }; 