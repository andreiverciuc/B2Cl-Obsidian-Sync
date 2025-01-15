import { App, PluginSettingTab, Setting, ButtonComponent, Notice } from 'obsidian';
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

        // B2 Settings
        containerEl.createEl('h3', {text: 'B2 Settings'});

        new Setting(containerEl)
            .setName('Bucket ID')
            .setDesc('Your B2 bucket ID')
            .addText(text => text
                .setPlaceholder('Enter your bucket ID')
                .setValue(this.plugin.settings.bucketId)
                .onChange(async (value) => {
                    this.plugin.settings.bucketId = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Application Key ID')
            .setDesc('Your B2 application key ID')
            .addText(text => text
                .setPlaceholder('Enter your application key ID')
                .setValue(this.plugin.settings.applicationKeyId)
                .onChange(async (value) => {
                    this.plugin.settings.applicationKeyId = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Application Key')
            .setDesc('Your B2 application key')
            .addText(text => text
                .setPlaceholder('Enter your application key')
                .setValue(this.plugin.settings.applicationKey)
                .onChange(async (value) => {
                    this.plugin.settings.applicationKey = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Bucket Name')
            .setDesc('Your B2 bucket name')
            .addText(text => text
                .setPlaceholder('Enter your bucket name')
                .setValue(this.plugin.settings.bucketName)
                .onChange(async (value) => {
                    this.plugin.settings.bucketName = value;
                    await this.plugin.saveSettings();
                }));

        containerEl.createEl('h3', {text: 'Logging Settings'});

        new Setting(containerEl)
            .setName('Enable Logging')
            .setDesc('Enable detailed sync logging')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.logging.enabled)
                .onChange(async (value) => {
                    this.plugin.settings.logging.enabled = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Log Level')
            .setDesc('Set the level of detail for logs')
            .addDropdown(dropdown => dropdown
                .addOption('debug', 'Debug')
                .addOption('info', 'Info')
                .addOption('warn', 'Warning')
                .addOption('error', 'Error')
                .setValue(this.plugin.settings.logging.logLevel)
                .onChange(async (value: 'debug' | 'info' | 'warn' | 'error') => {
                    this.plugin.settings.logging.logLevel = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Log to File')
            .setDesc('Save logs to a file in your vault')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.logging.logToFile)
                .onChange(async (value) => {
                    this.plugin.settings.logging.logToFile = value;
                    await this.plugin.saveSettings();
                }));

        if (this.plugin.settings.logging.logToFile) {
            new Setting(containerEl)
                .setName('Log File Path')
                .setDesc('Path to the log file in your vault')
                .addText(text => text
                    .setPlaceholder('.obsidian/plugins/b2cl-sync/sync.log')
                    .setValue(this.plugin.settings.logging.logFilePath || '')
                    .onChange(async (value) => {
                        this.plugin.settings.logging.logFilePath = value;
                        await this.plugin.saveSettings();
                    }));
        }

        new Setting(containerEl)
            .setName('Show Sync Statistics')
            .setDesc('Show detailed statistics after each sync')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.showSyncStats)
                .onChange(async (value) => {
                    this.plugin.settings.showSyncStats = value;
                    await this.plugin.saveSettings();
                }));
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