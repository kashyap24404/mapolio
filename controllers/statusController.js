import { supabaseAdmin } from '../config/supabase.js';

/**
 * Update task status in scraper_task table
 * Now targets scraper_task table instead of legacy scraping_requests
 */
export const updateStatus = async (req, res) => {
  const { task_id, status, progress, total_results, error_message, credits_used } = req.body;
  
  try {
    // Validate required fields
    if (!task_id || !status) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: task_id and status' 
      });
    }

    const updateData = {
      status,
      updated_at: new Date().toISOString()
    };
    
    // Add optional fields if provided
    if (typeof progress === 'number') updateData.progress = Math.max(0, Math.min(100, progress));
    if (typeof total_results === 'number') updateData.total_results = total_results;
    if (typeof credits_used === 'number') updateData.credits_used = credits_used;
    if (error_message) updateData.error_message = error_message;

    const { data, error } = await supabaseAdmin
      .from('scraper_task')
      .update(updateData)
      .eq('id', task_id)
      .select();

    if (error) throw error;

    if (data.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Task not found' 
      });
    }

    res.json({ 
      success: true, 
      data: data[0],
      message: `Task ${task_id} status updated to ${status}` 
    });
  } catch (error) {
    console.error('Error updating task status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get task status from scraper_task table
 * Now targets scraper_task table instead of legacy scraping_requests
 */
export const getStatus = async (req, res) => {
  const { task_id } = req.params;
  const { user_id } = req.query; // Optional user_id for additional security

  try {
    let query = supabaseAdmin
      .from('scraper_task')
      .select('id, status, progress, total_results, credits_used, error_message, created_at, updated_at, config')
      .eq('id', task_id);

    // If user_id provided, add it as additional filter for security
    if (user_id) {
      query = query.eq('user_id', user_id);
    }

    const { data, error } = await query;

    if (error) throw error;

    if (data.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Task not found' 
      });
    }

    const task = data[0];
    
    // Format response with useful information
    const response = {
      id: task.id,
      status: task.status,
      progress: task.progress,
      total_results: task.total_results || 0,
      credits_used: task.credits_used || 0,
      created_at: task.created_at,
      updated_at: task.updated_at,
      search_query: task.config?.search_query,
      data_fields: task.config?.data_fields
    };

    // Include error message if task failed
    if (task.status === 'failed' && task.error_message) {
      response.error_message = task.error_message;
    }

    res.json({ 
      success: true, 
      data: response 
    });
  } catch (error) {
    console.error('Error getting task status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Update task progress - utility function for incremental progress updates
 */
export const updateProgress = async (req, res) => {
  const { task_id } = req.params;
  const { progress } = req.body;

  try {
    if (!task_id || typeof progress !== 'number') {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: task_id and progress (number)' 
      });
    }

    const updateData = {
      progress: Math.max(0, Math.min(100, progress)),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabaseAdmin
      .from('scraper_task')
      .update(updateData)
      .eq('id', task_id)
      .select('id, status, progress');

    if (error) throw error;

    if (data.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Task not found' 
      });
    }

    res.json({ 
      success: true, 
      data: data[0],
      message: `Task ${task_id} progress updated to ${progress}%` 
    });
  } catch (error) {
    console.error('Error updating task progress:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Utility function for internal use - update task status programmatically
 * This is used by the scraping service and other internal functions
 */
export const updateTaskStatus = async (taskId, status, progress = null, errorMessage = null, additionalData = {}) => {
  try {
    const updateData = {
      status,
      updated_at: new Date().toISOString(),
      ...additionalData
    };
    
    if (typeof progress === 'number') {
      updateData.progress = Math.max(0, Math.min(100, progress));
    }
    
    if (errorMessage) {
      updateData.error_message = errorMessage;
    }
    
    const { error } = await supabaseAdmin
      .from('scraper_task')
      .update(updateData)
      .eq('id', taskId);
    
    if (error) {
      console.error(`Error updating task ${taskId} status:`, error);
      throw error;
    }
    
    console.log(`Task ${taskId} status updated to: ${status}${progress !== null ? ` (${progress}%)` : ''}`);
    return true;
  } catch (error) {
    console.error(`Error updating task status for ${taskId}:`, error);
    throw error;
  }
};