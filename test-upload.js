import dotenv from 'dotenv';
dotenv.config();

import uploadToStorage from './utils/uploadToStorage.js';
import path from 'path';
import fs from 'fs';

async function testUpload() {
  const localFilePath = path.join(process.cwd(), 'public', 'results_65c96798-1698-4333-8c29-a5f030b37f1d_37bc5bed-72d8-4211-a2a6-76094eada6df_BeautySalon_multiple_US.csv');

  if (!fs.existsSync(localFilePath)) {
    console.error('Test file not found at:', localFilePath);
    return;
  }

  const userId = 'test-user-123';
  const taskId = 'test-task-456';
  const fileType = 'csv';

  try {
    console.log('Starting upload test...');
    const storagePath = await uploadToStorage(localFilePath, userId, taskId, fileType);
    console.log('Upload successful! Storage path:', storagePath);
    console.log('Direct URL (for authenticated access):', `${process.env.SUPABASE_URL}/storage/v1/object/authenticated/user-tasks-store/${storagePath}`);
  } catch (error) {
    console.error('Upload failed:', error.message);
  }
}

testUpload();