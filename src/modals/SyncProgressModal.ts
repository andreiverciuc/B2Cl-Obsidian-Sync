import { App, Modal } from 'obsidian';
import { SyncAction } from '../types/sync';

export class SyncProgressModal extends Modal {
    private progressBar: HTMLDivElement;
    private statusText: HTMLParagraphElement;
    private currentFile: HTMLParagraphElement;
    private total: number;
    private completed: number = 0;

    constructor(
        app: App,
        private actions: SyncAction[],
        private onCancel: () => void
    ) {
        super(app);
        this.total = actions.length;
    }

    onOpen() {
        const { contentEl } = this;
        
        contentEl.createEl('h2', { text: 'Syncing Files' });
        
        this.progressBar = contentEl.createDiv({ cls: 'sync-progress-bar' });
        this.progressBar.createDiv({ cls: 'sync-progress-fill' });
        
        this.statusText = contentEl.createEl('p', { 
            cls: 'sync-status-text',
            text: `0/${this.total} files processed` 
        });

        this.currentFile = contentEl.createEl('p', { 
            cls: 'sync-current-file',
            text: 'Preparing...' 
        });

        const cancelButton = contentEl.createEl('button', {
            text: 'Cancel',
            cls: 'mod-warning'
        });
        cancelButton.onclick = () => {
            this.onCancel();
            this.close();
        };
    }

    updateProgress(action: SyncAction) {
        this.completed++;
        const percentage = (this.completed / this.total) * 100;
        
        this.progressBar.querySelector('.sync-progress-fill').style.width = `${percentage}%`;
        this.statusText.textContent = `${this.completed}/${this.total} files processed`;
        this.currentFile.textContent = `Processing: ${action.path}`;
    }
} 