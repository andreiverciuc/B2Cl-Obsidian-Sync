import { App, PluginSettingTab, Setting } from 'obsidian';
import type { B2SyncPlugin } from '../main';

export class B2SyncSettingsTab extends PluginSettingTab {
    plugin: B2SyncPlugin;
    activeTab: string = 'main';

    constructor(app: App, plugin: B2SyncPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const {containerEl} = this;
        containerEl.empty();

        const tabsEl = containerEl.createEl('div', { cls: 'nav-buttons-container' });
        
        const mainTabButton = tabsEl.createEl('button', { 
            text: 'Settings',
            cls: this.activeTab === 'main' ? 'nav-button active' : 'nav-button'
        });
        
        const aboutTabButton = tabsEl.createEl('button', {
            text: 'About',
            cls: this.activeTab === 'secondary' ? 'nav-button active' : 'nav-button'
        });

        mainTabButton.onclick = () => {
            this.activeTab = 'main';
            this.display();
        };

        aboutTabButton.onclick = () => {
            this.activeTab = 'secondary';
            this.display();
        };

        if (this.activeTab === 'main') {
            this.displayMainSettings(containerEl);
        } else {
            this.displayAboutPage(containerEl);
        }
    }

    displayMainSettings(containerEl: HTMLElement): void {
        containerEl.createEl('h2', {text: 'B2 Sync Settings'});

        new Setting(containerEl)
            .setName('Bucket ID')
            .setDesc('Your Backblaze B2 Bucket ID')
            .addText(text => text
                .setPlaceholder('Enter Bucket ID')
                .setValue(this.plugin.settings.bucketId)
                .onChange(async (value) => {
                    this.plugin.settings.bucketId = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Application Key ID')
            .setDesc('Your Backblaze B2 Application Key ID')
            .addText(text => text
                .setPlaceholder('Enter Application Key ID')
                .setValue(this.plugin.settings.applicationKeyId)
                .onChange(async (value) => {
                    this.plugin.settings.applicationKeyId = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Application Key')
            .setDesc('Your Backblaze B2 Application Key')
            .addText(text => text
                .setPlaceholder('Enter Application Key')
                .setValue(this.plugin.settings.applicationKey)
                .onChange(async (value) => {
                    this.plugin.settings.applicationKey = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Bucket Name')
            .setDesc('Your Backblaze B2 Bucket Name')
            .addText(text => text
                .setPlaceholder('Enter Bucket Name')
                .setValue(this.plugin.settings.bucketName)
                .onChange(async (value) => {
                    this.plugin.settings.bucketName = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Auto Sync')
            .setDesc('Enable automatic synchronization')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.autoSync)
                .onChange(async (value) => {
                    this.plugin.settings.autoSync = value;
                    await this.plugin.saveSettings();
                    this.plugin.setupAutoSync();
                }));

        new Setting(containerEl)
            .setName('Sync Interval')
            .setDesc('How often to sync (in minutes)')
            .addText(text => text
                .setPlaceholder('60')
                .setValue(String(this.plugin.settings.syncInterval))
                .onChange(async (value) => {
                    const numValue = Number(value);
                    if (!isNaN(numValue) && numValue > 0) {
                        this.plugin.settings.syncInterval = numValue;
                        await this.plugin.saveSettings();
                        if (this.plugin.settings.autoSync) {
                            this.plugin.setupAutoSync();
                        }
                    }
                }));

        const lastSyncText = this.plugin.settings.lastSync 
            ? `Last sync: ${new Date(this.plugin.settings.lastSync).toLocaleString()}`
            : 'Never synced';
            
        containerEl.createEl('p', {
            text: lastSyncText,
            cls: 'sync-status'
        });
    }

    displayAboutPage(containerEl: HTMLElement): void {
        const aboutContainer = containerEl.createDiv({ cls: 'about-container' });

        aboutContainer.createEl('h2', { text: 'B2CL Obsidian Sync' });

        aboutContainer.createEl('p', { 
            text: 'This plugin allows you to sync your Obsidian vault with Backblaze B2 cloud storage.'
        });

        const featureList = aboutContainer.createEl('ul');
        featureList.createEl('li', { text: 'Secure cloud backup of your vault' });
        featureList.createEl('li', { text: 'Configurable sync settings' });
        featureList.createEl('li', { text: 'Cost-effective storage solution' });
        featureList.createEl('li', { text: 'Automated backup process' });

        const versionInfo = aboutContainer.createEl('div', { cls: 'version-info' });
        versionInfo.createEl('p', { text: `Version: ${this.plugin.manifest.version}` });
    }
} 