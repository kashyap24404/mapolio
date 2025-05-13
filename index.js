import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import apiRoutes from './routes/api.js';

const app = express();
const port = process.env.PORT || 3001;

app.use(express.static('public'));

// Middleware
app.use(cors());
app.use(express.json());

// API routes
app.use('/', apiRoutes);

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});