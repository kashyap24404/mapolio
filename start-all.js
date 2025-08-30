// start-all.js - Integrated script to run both web server and worker listener
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRoutes from './routes/api.js';
import WorkerListener from './worker-listener.js';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(express.static('public'));
app.use(cors());
app.use(express.json());

// API routes
app.use('/', apiRoutes);

// Start server
const server = app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});

// Initialize and start worker listener
const worker = new WorkerListener();

// Setup graceful shutdown for both server and worker
const shutdown = async () => {
  console.log('\n📡 Initiating graceful shutdown...');
  
  // Close server
  server.close(() => {
    console.log('🔴 Web server closed');
  });
  
  // Stop worker listener
  await worker.stop();
  
  process.exit(0);
};

// Handle shutdown signals
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('SIGQUIT', shutdown);

// Handle uncaught exceptions
process.on('uncaughtException', async (error) => {
  console.error('🚨 Uncaught Exception:', error);
  await shutdown();
});

process.on('unhandledRejection', async (reason, promise) => {
  console.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
  await shutdown();
});

// Start worker listener
console.log('🏁 Initializing Worker Listener...');
worker.setupGracefulShutdown();
worker.start().catch(error => {
  console.error('💥 Failed to start worker listener:', error);
  process.exit(1);
});

console.log('🔄 Both web server and worker listener are now running!');