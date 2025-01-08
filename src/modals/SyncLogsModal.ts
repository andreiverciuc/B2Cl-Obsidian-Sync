import { App, Modal } from 'obsidian';
import { LogService, SyncLogEntry } from '../services/LogService';

export class SyncLogsModal extends Modal {
    constructor(
        app: App,
        private logService: LogService
    ) {
        super(app);
    }

    onOpen() {
        const { contentEl } = this;
        
        contentEl.createEl('h2', { text: 'Sync Logs' });
        
        const logsContainer = contentEl.createDiv({ cls: 'sync-logs-container' });
        
        const logs = this.logService.getRecentLogs();
        if (logs.length === 0) {
            logsContainer.createEl('p', { text: 'No logs available' });
        } else {
            const pre = logsContainer.createEl('pre');
            logs.forEach(log => {
                pre.createEl('code', { 
                    text: this.logService.formatLog(log) 
                });
            });
        }

        new ButtonComponent(contentEl)
            .setButtonText('Close')
            .onClick(() => this.close());
    }
} 