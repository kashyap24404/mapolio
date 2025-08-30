import fs from 'fs/promises';
import path from 'path';

export async function saveVerificationFile(task_id, skippedLinksData) {
    if (!task_id || !skippedLinksData || skippedLinksData.length === 0) {
        console.log('No skipped links to save or task_id missing.');
        return;
    }

    const fileName = `ProCooVerify_${task_id}.json`;
    const filePath = path.join(process.cwd(), 'public', fileName);

    try {
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, JSON.stringify(skippedLinksData, null, 2), 'utf-8');
        console.log(`Verification file saved: ${fileName}`);
    } catch (error) {
        console.error(`Error saving verification file for task ${task_id}:`, error);
    }
}
