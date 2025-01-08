import { App, Modal, Setting } from 'obsidian';
import { FileMetadata } from '../types/sync';

interface DeletedFileChoice {
    file: FileMetadata;
    action: 'delete' | 'download' | 'skip';
}

export class DeletedFilesModal extends Modal {
    private choices: DeletedFileChoice[] = [];

    constructor(
        app: App,
        private deletedFiles: FileMetadata[],
        private onConfirm: (choices: DeletedFileChoice[]) => void
    ) {
        super(app);
        this.choices = deletedFiles.map(file => ({
            file,
            action: 'skip'
        }));
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl('h2', { text: 'Deleted Files Detected' });
        contentEl.createEl('p', { 
            text: 'The following files exist in B2 but were deleted locally:',
            cls: 'setting-item-description'
        });

        const fileList = contentEl.createDiv('deleted-files-list');

        this.choices.forEach((choice, index) => {
            const fileItem = new Setting(fileList)
                .setName(choice.file.path)
                .setDesc(`Last modified: ${new Date(choice.file.modifiedTime).toLocaleString()} • Size: ${this.formatBytes(choice.file.size)}`)
                .addDropdown(dropdown => dropdown
                    .addOption('skip', 'Skip')
                    .addOption('delete', 'Delete from B2')
                    .addOption('download', 'Download')
                    .setValue(choice.action)
                    .onChange(value => {
                        this.choices[index].action = value as 'delete' | 'download' | 'skip';
                    }));
            
            fileItem.settingEl.addClass('deleted-file-item');
        });

        const footer = contentEl.createDiv('modal-footer');
        
        const confirmBtn = footer.createEl('button', {
            text: 'Confirm',
            cls: 'mod-cta'
        });
        confirmBtn.onclick = () => {
            this.onConfirm(this.choices);
            this.close();
        };

        const cancelBtn = footer.createEl('button', {
            text: 'Cancel'
        });
        cancelBtn.onclick = () => this.close();
    }

    private formatBytes(bytes: number): string {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
    }
} 