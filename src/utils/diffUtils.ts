import { diffLines, Change } from 'diff';

export function createDiffView(container: HTMLElement, local: string, remote: string) {
    const diff = diffLines(local, remote);
    const pre = container.createEl('pre', { cls: 'diff-view' });

    diff.forEach((part: Change) => {
        const color = part.added ? 'var(--text-success)' : 
                     part.removed ? 'var(--text-error)' : 
                     'var(--text-normal)';
        
        const span = pre.createEl('span', {
            text: part.value,
            cls: part.added ? 'diff-added' : 
                 part.removed ? 'diff-removed' : 
                 'diff-unchanged'
        });
        span.style.color = color;
    });
} 