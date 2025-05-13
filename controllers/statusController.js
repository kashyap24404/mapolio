import { supabaseAdmin } from '../config/supabase.js';

export const updateStatus = async (req, res) => {
  const { user_id, task_id, status, result_url, row_count } = req.body;
  
  try {
    const updateData = {
      status,
      updated_at: new Date().toISOString()
    };
    
    if (result_url) updateData.result_url = result_url;
    if (row_count) updateData.row_count = row_count;

    const { data, error } = await supabaseAdmin
      .from('scraping_requests')
      .update(updateData)
      .eq('user_id', user_id)
      .eq('task_id', task_id);

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getStatus = async (req, res) => {
  const { user_id, task_id } = req.params;

  try {
    const { data, error } = await supabaseAdmin
      .from('scraping_requests')
      .select('status, result_url, row_count')
      .eq('user_id', user_id)
      .eq('task_id', task_id);

    if (error) throw error;

    if (data.length === 0) {
      return res.status(404).json({ success: false, error: 'Request not found' });
    }

    res.json({ success: true, data: data[0] });
  } catch (error) {
    console.error('Error getting status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};