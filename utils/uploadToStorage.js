import fs from 'fs';
import path from 'path';
import { supabaseAdmin } from '../config/supabase.js';

/**
 * Upload a file to Supabase Storage
 * @param {string} localFilePath - Path to the local file
 * @param {string} userId - User ID for folder structure
 * @param {string} taskId - Task ID for file organization
 * @param {string} fileType - Type of file ('json' or 'csv')
 * @returns {Promise<string>} - The path of the uploaded file
 */
const uploadToStorage = async (localFilePath, userId, taskId, fileType) => {
  try {
    // Create organized path structure: user_id/task_id/filename
    const fileName = path.basename(localFilePath);
    const storagePath = `${userId}/${taskId}/${fileName}`;
    
    // Determine content type based on file extension
    const contentType = fileType === 'json'
      ? 'application/json'
      : 'text/csv';
    
    // Read file as Buffer
    const fileBuffer = await fs.promises.readFile(localFilePath);
    
    // Upload using Supabase Storage client
    const { data, error } = await supabaseAdmin.storage
      .from('user-tasks-store')
      .upload(storagePath, fileBuffer, {
        contentType: contentType,
        upsert: true
      });
    
    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }
    
    // Clean up local file after successful upload
    fs.unlinkSync(localFilePath);
    
    // Return the storage path for database storage
    return storagePath;
  } catch (error) {
    console.error('Error uploading to storage:', error);
    throw error;
  }
};

export default uploadToStorage;