// worker-listener.js - Asynchronous Job Processing Entry Point
import { supabaseAdmin } from './config/supabase.js';
import { runScrapingTask } from './services/scraperService.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

class WorkerListener {
    constructor() {
        this.isRunning = false;
        this.processedTasks = new Set();
        this.retryCount = 3;
        this.maxConcurrentTasks = parseInt(process.env.MAX_CONCURRENT_TASKS, 10) || 3;
        this.activeTasks = new Map(); // Track active tasks to prevent duplicates
    }

    async start() {
        if (this.isRunning) {
            console.log('Worker listener is already running');
            return;
        }

        this.isRunning = true;
        console.log('🚀 Worker Listener started - Monitoring for new scraping tasks...');
        console.log(`📋 Configuration: Max concurrent tasks = ${this.maxConcurrentTasks}`);

        // Start the main polling loop
        await this.startPolling();
    }

    async startPolling() {
        while (this.isRunning) {
            try {
                await this.checkForPendingTasks();
                await this.sleep(5000); // Poll every 5 seconds
            } catch (error) {
                console.error('Error in polling loop:', error);
                await this.sleep(10000); // Wait longer on error
            }
        }
    }

    async checkForPendingTasks() {
        try {
            // Check if we have capacity for more tasks
            if (this.activeTasks.size >= this.maxConcurrentTasks) {
                return; // Skip if at capacity
            }

            // Fetch pending tasks from the database
            const { data: pendingTasks, error } = await supabaseAdmin
                .from('scraper_task')
                .select('*')
                .eq('status', 'pending')
                .order('created_at', { ascending: true })
                .limit(this.maxConcurrentTasks - this.activeTasks.size);

            if (error) {
                console.error('Error fetching pending tasks:', error);
                return;
            }

            if (pendingTasks && pendingTasks.length > 0) {
                console.log(`📥 Found ${pendingTasks.length} pending task(s)`);
                
                for (const task of pendingTasks) {
                    if (!this.activeTasks.has(task.id) && !this.processedTasks.has(task.id)) {
                        await this.processTask(task);
                    }
                }
            }
        } catch (error) {
            console.error('Error checking for pending tasks:', error);
        }
    }

    async processTask(task) {
        const taskId = task.id;
        const userId = task.user_id;

        try {
            // Mark task as running and add to active tasks
            this.activeTasks.set(taskId, { startTime: Date.now(), userId });
            this.processedTasks.add(taskId);

            // Update task status to 'running'
            await this.updateTaskStatus(taskId, 'running', 0);
            
            console.log(`🔄 Starting task ${taskId} for user ${userId}`);
            console.log(`📊 Config: ${JSON.stringify(task.config, null, 2)}`);

            // Process the task asynchronously (don't await - let it run in background)
            this.runTaskAsync(task);

        } catch (error) {
            console.error(`Error starting task ${taskId}:`, error);
            await this.updateTaskStatus(taskId, 'failed', 0, `Failed to start: ${error.message}`);
            this.activeTasks.delete(taskId);
        }
    }

    async runTaskAsync(task) {
        const taskId = task.id;
        
        try {
            // Call the refactored scraper service
            const result = await runScrapingTask(task);
            
            // Update task as completed
            await this.updateTaskStatus(taskId, 'completed', 100);
            console.log(`✅ Task ${taskId} completed successfully`);
            console.log(`📈 Results: ${result.rowCount || 0} records extracted`);

        } catch (error) {
            console.error(`❌ Task ${taskId} failed:`, error);
            await this.updateTaskStatus(taskId, 'failed', 0, error.message);
            
        } finally {
            // Remove from active tasks
            this.activeTasks.delete(taskId);
            
            const activeCount = this.activeTasks.size;
            console.log(`📊 Active tasks: ${activeCount}/${this.maxConcurrentTasks}`);
        }
    }

    async updateTaskStatus(taskId, status, progress, errorMessage = null) {
        try {
            const updateData = {
                status,
                progress,
                updated_at: new Date().toISOString()
            };

            if (errorMessage) {
                updateData.error_message = errorMessage;
            }

            const { error } = await supabaseAdmin
                .from('scraper_task')
                .update(updateData)
                .eq('id', taskId);

            if (error) {
                console.error(`Error updating task ${taskId} status:`, error);
            } else {
                console.log(`📝 Task ${taskId} status updated to: ${status} (${progress}%)`);
            }
        } catch (error) {
            console.error(`Error updating task ${taskId}:`, error);
        }
    }

    async stop() {
        console.log('🛑 Stopping worker listener...');
        this.isRunning = false;
        
        // Wait for active tasks to complete (with timeout)
        const timeout = 30000; // 30 seconds
        const startTime = Date.now();
        
        while (this.activeTasks.size > 0 && (Date.now() - startTime) < timeout) {
            console.log(`⏳ Waiting for ${this.activeTasks.size} active task(s) to complete...`);
            await this.sleep(2000);
        }
        
        if (this.activeTasks.size > 0) {
            console.log(`⚠️  Force stopping with ${this.activeTasks.size} active task(s)`);
        }
        
        console.log('🔴 Worker listener stopped');
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Graceful shutdown handlers
    setupGracefulShutdown() {
        const signals = ['SIGINT', 'SIGTERM', 'SIGQUIT'];
        
        signals.forEach(signal => {
            process.on(signal, async () => {
                console.log(`\n📡 Received ${signal}, initiating graceful shutdown...`);
                await this.stop();
                process.exit(0);
            });
        });
        
        process.on('uncaughtException', async (error) => {
            console.error('🚨 Uncaught Exception:', error);
            await this.stop();
            process.exit(1);
        });
        
        process.on('unhandledRejection', async (reason, promise) => {
            console.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
            await this.stop();
            process.exit(1);
        });
    }
}

// Main execution
async function main() {
    console.log('🏁 Initializing Worker Listener...');
    
    const worker = new WorkerListener();
    worker.setupGracefulShutdown();
    
    try {
        await worker.start();
    } catch (error) {
        console.error('💥 Failed to start worker listener:', error);
        process.exit(1);
    }
}

// Only run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(error => {
        console.error('💥 Fatal error:', error);
        process.exit(1);
    });
}

export default WorkerListener;