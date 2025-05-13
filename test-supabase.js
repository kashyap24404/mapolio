import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create two Supabase clients - one with anon key and one with service role
const supabaseAnon = createClient(
    process.env.SUPABASE_URL,
    process.env.ANON
);

const supabaseService = createClient(
    process.env.SUPABASE_URL,
    process.env.SERVICE_ROLE
);

async function testSupabaseConnection() {
    try {
        console.log('Testing Supabase connection...\n');

        // Test with anon key
        console.log('=== Testing with ANON key ===');
        const { data: anonData, error: anonError } = await supabaseAnon
            .from('scraping_requests')
            .select('*');

        if (anonError) {
            console.error('Anon Key Fetch Error:', anonError);
        } else {
            console.log('Total records (anon):', anonData.length);
            if (anonData.length > 0) {
                console.log('First record structure:', Object.keys(anonData[0]));
                console.log('All records:', JSON.stringify(anonData, null, 2));
            } else {
                console.log('No records found with anon key');
            }
        }

        // Test with service role key
        console.log('\n=== Testing with SERVICE ROLE key ===');
        const { data: serviceData, error: serviceError } = await supabaseService
            .from('scraping_requests')
            .select('*');

        if (serviceError) {
            console.error('Service Role Fetch Error:', serviceError);
        } else {
            console.log('Total records (service role):', serviceData.length);
            if (serviceData.length > 0) {
                console.log('First record structure:', Object.keys(serviceData[0]));
                console.log('All records:', JSON.stringify(serviceData, null, 2));
            } else {
                console.log('No records found with service role key');
            }
        }

    } catch (error) {
        console.error('Unexpected error:', error);
    }
}

// Run the test
testSupabaseConnection(); 