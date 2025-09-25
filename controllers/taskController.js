// controllers/taskController.js
import { supabaseAdmin } from '../config/supabase.js';

/**
 * POST /api/v1/tasks
 * Creates a new scraping task and adds it to the queue
 * 
 * Expected JSON payload structure:
 * {
 *   "search_query": "restaurants",
 *   "location_rules": {
 *     "base": [{ "type": "country", "name": "US" }],
 *     "exclude": [
 *       { "type": "state", "name": "California" },
 *       { "type": "zip", "zip_code": "12345" }
 *     ]
 *   },
 *   "data_fields": ["name", "address", "phone"],
 *   "rating_filter": "4",
 *   "advanced_options": {
 *     "extract_single_image": true,
 *     "max_reviews": 50
 *   },
 *   "total_selected_zip_codes": 36000  // Optional: Total ZIP codes for progress tracking
 * }
 */
export const createTask = async (req, res) => {
    try {
        const userId = req.user.id;
        const config = req.body;

        // Validate required fields in the config
        if (!config.search_query) {
            return res.status(400).json({
                success: false,
                error: 'Missing required field: search_query'
            });
        }

        if (!config.location_rules || !config.location_rules.base || !Array.isArray(config.location_rules.base)) {
            return res.status(400).json({
                success: false,
                error: 'Missing or invalid location_rules.base'
            });
        }

        if (!config.data_fields || !Array.isArray(config.data_fields) || config.data_fields.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Missing or invalid data_fields array'
            });
        }

        // Insert new task into scraper_task table
        const { data: taskData, error: insertError } = await supabaseAdmin
            .from('scraper_task')
            .insert({
                user_id: userId,
                config: config,
                status: 'pending',
                progress: 0,
                total_results: 0,
                credits_used: 0
            })
            .select()
            .single();

        if (insertError) {
            console.error('Error inserting task:', insertError);
            return res.status(500).json({
                success: false,
                error: 'Failed to create task',
                details: insertError.message
            });
        }

        // Respond immediately with task ID
        res.status(202).json({
            success: true,
            taskId: taskData.id,
            message: 'Task created successfully and queued for processing'
        });

        console.log(`New scraping task created: ${taskData.id} for user: ${userId}`);

    } catch (error) {
        console.error('Error in createTask:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error.message
        });
    }
};

/**
 * GET /api/v1/tasks/:taskId
 * Gets the status and details of a specific task
 */
export const getTask = async (req, res) => {
    try {
        const userId = req.user.id;
        const { taskId } = req.params;

        // Fetch task details
        const { data: taskData, error: fetchError } = await supabaseAdmin
            .from('scraper_task')
            .select('*')
            .eq('id', taskId)
            .eq('user_id', userId)
            .single();

        if (fetchError) {
            if (fetchError.code === 'PGRST116') {
                return res.status(404).json({
                    success: false,
                    error: 'Task not found'
                });
            }
            throw fetchError;
        }

        // Construct direct download URLs
        const baseUrl = process.env.SUPABASE_URL;
        const bucket = 'user-tasks-store';
        const csvPath = taskData.result_csv_url;
        const jsonPath = taskData.result_json_url;
        
        const csvDownloadUrl = csvPath ? `${baseUrl}/storage/v1/object/authenticated/${bucket}/${csvPath}` : null;
        const jsonDownloadUrl = jsonPath ? `${baseUrl}/storage/v1/object/authenticated/${bucket}/${jsonPath}` : null;
        
        const enhancedTask = {
            ...taskData,
            csv_download_url: csvDownloadUrl,
            json_download_url: jsonDownloadUrl
        };
        
        res.json({
            success: true,
            task: enhancedTask
        });

    } catch (error) {
        console.error('Error in getTask:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error.message
        });
    }
};

/**
 * GET /api/v1/tasks
 * Gets all tasks for the authenticated user
 */
export const getUserTasks = async (req, res) => {
    try {
        const userId = req.user.id;
        const { status, limit = 50, offset = 0 } = req.query;

        let query = supabaseAdmin
            .from('scraper_task')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(parseInt(limit))
            .offset(parseInt(offset));

        if (status) {
            query = query.eq('status', status);
        }

        const { data: tasks, error: fetchError } = await query;

        if (fetchError) {
            throw fetchError;
        }

        // Construct direct download URLs for each task
        const baseUrl = process.env.SUPABASE_URL;
        const bucket = 'user-tasks-store';
        
        const enhancedTasks = tasks.map(task => {
            const csvPath = task.result_csv_url;
            const jsonPath = task.result_json_url;
            
            const csvDownloadUrl = csvPath ? `${baseUrl}/storage/v1/object/authenticated/${bucket}/${csvPath}` : null;
            const jsonDownloadUrl = jsonPath ? `${baseUrl}/storage/v1/object/authenticated/${bucket}/${jsonPath}` : null;
            
            return {
                ...task,
                csv_download_url: csvDownloadUrl,
                json_download_url: jsonDownloadUrl
            };
        });
        
        res.json({
            success: true,
            tasks: enhancedTasks,
            pagination: {
                limit: parseInt(limit),
                offset: parseInt(offset),
                total: enhancedTasks.length
            }
        });

    } catch (error) {
        console.error('Error in getUserTasks:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error.message
        });
    }
};

/**
 * Calculate estimated credits required for a task
 * This is a basic estimation - can be refined based on business logic
 */
// function calculateEstimatedCredits(config) {
//     let baseCredits = 10; // Base cost per task
//     
//     // Add credits based on data fields requested
//     const dataFieldCredits = config.data_fields.length * 2;
//     
//     // Add credits based on advanced options
//     let advancedCredits = 0;
//     if (config.advanced_options) {
//         if (config.advanced_options.extract_single_image) advancedCredits += 5;
//         if (config.advanced_options.max_reviews && config.advanced_options.max_reviews > 10) {
//             advancedCredits += Math.ceil(config.advanced_options.max_reviews / 10) * 3;
//         }
//     }
//     
//     // Add credits based on location scope (basic estimation)
//     let locationCredits = 0;
//     if (config.location_rules.base) {
//         config.location_rules.base.forEach(location => {
//             if (location.type === 'country') locationCredits += 50;
//             if (location.type === 'state') locationCredits += 15;
//             if (location.type === 'city') locationCredits += 5;
//             if (location.type === 'zip') locationCredits += 1;
//         });
//     }
//     
//     return baseCredits + dataFieldCredits + advancedCredits + locationCredits;
// }