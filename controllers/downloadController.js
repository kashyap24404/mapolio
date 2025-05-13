import path from 'path';

export const downloadFile = (req, res) => {
  const { user_id, task_id } = req.params;
  // This file name must match the naming convention used in runScraping
  const fileName = `results_${user_id}_${task_id}.csv`;
  // Build the file path from the public folder
  const filePath = path.join(process.cwd(), 'public', fileName);

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
  const { user_id, task_id } = req.params;
  // This file name must match the naming convention used in runScraping
  const fileName = `results_${user_id}_${task_id}.json`;
  // Build the file path from the public folder
  const filePath = path.join(process.cwd(), 'public', fileName);

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
