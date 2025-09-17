import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import apiRoutes from './routes/api.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { tunnelmole } = require('tunnelmole');

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
  // Start tunnelmole tunnel
  (async () => {
    try {
      const url = await tunnelmole({ port });
      console.log(`Tunnelmole tunnel established at: ${url}`);
    } catch (err) {
      console.error('Error starting tunnelmole tunnel:', err);
    }
  })();
});