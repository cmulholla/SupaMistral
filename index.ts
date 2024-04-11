// this file will be the backend for the AI aspect of the application
// it will be responsible for the following:
// 1. signing into the SupaBase database using admin credentials
//      - subscribe to the Supabase to listen for changes
// 2. fetching the UserData table from the database
// 3. loading the Mistral AI model
// 4. running the model on the user's skills and talents
// 5. returning the results to the database
// 6. waiting for the database to ask for changes

// import the necessary libraries
import { createClient } from '@supabase/supabase-js';
import { Database } from './lib/schema'
import dotenv from 'dotenv';
dotenv.config();

// create a Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_KEY || ''
);

const channel = supabase
  .channel('schema-db-changes')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
    },
    (payload) => console.log(payload)
  )
  .subscribe()

// export the module
export default {};