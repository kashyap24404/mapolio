import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create Supabase client with anon key for regular operations
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

// Create Supabase client with service role for admin operations
const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// JWT verification middleware for routes
export const verifyJWT = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        const { data: { user }, error } = await supabase.auth.getUser(token);
        
        if (error || !user) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('JWT verification error:', error);
        res.status(401).json({ error: 'Token verification failed' });
    }
};

// Helper function to check user credits
export const checkUserCredits = async (userId, requiredCredits) => {
    const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('credits')
        .eq('id', userId)
        .single();
    
    if (error) {
        throw new Error(`Failed to fetch user credits: ${error.message}`);
    }
    
    return data.credits >= requiredCredits;
};

// Helper function to deduct credits
export const deductCredits = async (userId, amount, taskId, description) => {
    // First, fetch the current credits
    const { data: userData, error: fetchError } = await supabaseAdmin
        .from('profiles')
        .select('credits')
        .eq('id', userId)
        .single();
    
    if (fetchError) {
        throw new Error(`Failed to fetch user credits: ${fetchError.message}`);
    }
    
    // Calculate new credits value
    const newCredits = userData.credits - amount;
    
    // Update with the new value
    const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({ credits: newCredits })
        .eq('id', userId);
    
    if (profileError) {
        throw new Error(`Failed to deduct credits: ${profileError.message}`);
    }
    
    // Record the transaction
    const { error: transactionError } = await supabaseAdmin
        .from('credit_transactions')
        .insert({
            user_id: userId,
            amount: -amount,
            type: 'scraping',
            description: description || 'Scraping task',
            related_request_id: taskId
        });
    
    if (transactionError) {
        console.error('Failed to record credit transaction:', transactionError);
    }
};

// Export both named and default for backward compatibility
export { supabase, supabaseAdmin };
export default supabase;