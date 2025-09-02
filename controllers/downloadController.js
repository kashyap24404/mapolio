import path from 'path';

export const downloadFile = (req, res) => {
  const { user_id, task_id, filename } = req.params;
  
  // Check if filename is provided
  let filePath;
  if (filename) {
    // Use the provided filename
    filePath = path.join(process.cwd(), 'public', filename);
  } else {
    // Use the legacy naming convention
    const fileName = `results_${user_id}_${task_id}.csv`;
    filePath = path.join(process.cwd(), 'public', fileName);
  }

  res.sendFile(filePath, (err) => {
    if (err) {
      console.error('Error sending file:', err);
      res.status(500).json({
        success: false,
        error: err.message,
        message: 'Failed to send the file'
      });
    }
  });
};

export const downloadJsonFile = (req, res) => {
  const { user_id, task_id, filename } = req.params;
  
  // Check if filename is provided
  let filePath;
  if (filename) {
    // Use the provided filename
    filePath = path.join(process.cwd(), 'public', filename);
  } else {
    // Use the legacy naming convention
    const fileName = `results_${user_id}_${task_id}.json`;
    filePath = path.join(process.cwd(), 'public', fileName);
  }

  res.sendFile(filePath, (err) => {
    if (err) {
      console.error('Error sending file:', err);
      res.status(500).json({
        success: false,
        error: err.message,
        message: 'Failed to send the file'
      });
    }
  });
};