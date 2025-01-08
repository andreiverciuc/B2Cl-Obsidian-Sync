import { App, Modal } from 'obsidian';
import { SyncStatistics } from '../types/sync';

export class SyncStatsModal extends Modal {
    constructor(
        app: App,
        private stats: SyncStatistics
    ) {
        super(app);
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('sync-stats-modal');

        // Header
        const header = contentEl.createDiv('sync-stats-header');
        header.createEl('h2', { text: 'Sync Complete' });

        // Stats grid
        const grid = contentEl.createDiv('sync-stats-grid');

        // Duration
        const duration = this.stats.endTime ? 
            ((this.stats.endTime - this.stats.startTime) / 1000).toFixed(1) : 
            '0.0';
        this.addStatItem(grid, 'Duration', `${duration}s`, 'clock');

        // Files count
        this.addStatItem(grid, 'Files Processed', `${this.stats.filesProcessed}`, 'files');
        
        // Uploads
        if (this.stats.filesUploaded > 0) {
            this.addStatItem(grid, 'Uploaded', `${this.stats.filesUploaded}`, 'upload');
        }
        
        // Downloads
        if (this.stats.filesDownloaded > 0) {
            this.addStatItem(grid, 'Downloaded', `${this.stats.filesDownloaded}`, 'download');
        }
        
        // Deletions
        if (this.stats.filesDeleted > 0) {
            this.addStatItem(grid, 'Deleted', `${this.stats.filesDeleted}`, 'trash');
        }

        // Total data
        this.addStatItem(grid, 'Total Data', this.formatBytes(this.stats.totalBytes), 'database');

        // Close button
        const footer = contentEl.createDiv('sync-stats-footer');
        const closeButton = footer.createEl('button', {
            text: 'Close',
            cls: 'mod-cta'
        });
        closeButton.onclick = () => this.close();
    }

    private addStatItem(container: HTMLElement, label: string, value: string, icon: string) {
        const item = container.createDiv('sync-stat-item');
        const iconEl = item.createDiv('sync-stat-icon');
        iconEl.innerHTML = `<svg class="lucide"><use href="#lucide-${icon}"></use></svg>`;
        item.createDiv('sync-stat-label').setText(label);
        item.createDiv('sync-stat-value').setText(value);
    }

    private formatBytes(bytes: number): string {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
    }
} 