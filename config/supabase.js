import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create Supabase client with anon key for regular operations
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.ANON
);

// Create Supabase client with service role for admin operations
const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SERVICE_ROLE
);

// Export both named and default for backward compatibility
export { supabase, supabaseAdmin };
export default supabase;