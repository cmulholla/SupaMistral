// this file will be the backend for the AI aspect of the application
// it will be responsible for the following:
// 1. signing into the SupaBase database using admin credentials
//      - subscribe to the Supabase to listen for changes
// 2. fetching the UserData table from the database
// 3. loading the Mistral AI model
// 4. running the model on the user's skills and talents
// 5. returning the results to the database
// 6. waiting for the database to ask for changes


// You are an AI assistant that reads a username, a list of skills, and a list of talents. You describe the user with json, under the tag Description. You can only describe this user in your own words, as the Description tag is a string type.

/*
{
  Username: "Connor",
  Skills: "JS, Py, C++, AI",
  Talents: "Fast learner, thinks like a programmer"
}
*/

// import the necessary libraries
import { createClient } from '@supabase/supabase-js';
import { Database } from './lib/schema'
import dotenv from 'dotenv';
import OpenAI from 'openai';

dotenv.config();

// create a Supabase client
const client = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_KEY || ''
);

// create an OpenAI client
const openai = new OpenAI({apiKey: process.env.OPENAI_API_KEY || '' });

// create the run_model function
async function run_model(prompt: string, username: string,skills: string, talents: string) {
  // run the AI model on the record using mistral.py
  const completion = await openai.chat.completions.create({
    messages: [
      { role: "system", content: prompt },
      { role: "user", content: `{ "Username": "${username}", "Skills": "${skills}", "Talents": "${talents}" }` },
    ],
    model: "gpt-3.5-turbo",
  });

  return completion.choices[0].message.content;
}

async function run_model_ticket(prompt: string, ticket_summary: string) {
  // run the AI model on the record using mistral.py
  const completion = await openai.chat.completions.create({
    messages: [
      { role: "system", content: prompt },
      { role: "user", content: `{ "Ticket Summary": "${ticket_summary}" }`},
    ],
    model: "gpt-3.5-turbo",
  });

  return completion.choices[0].message.content;
}


const channel = client
.channel('schema-db-changes')
.on(
  'postgres_changes',
  {
    event: '*',
    schema: 'public',
  },
  (payload) => {
    console.log('Change received!', payload);
    console.log('Table:', payload.table);
    if (payload.table === 'UserData') {
      console.log('UserData:')
      let payload_event = payload.eventType;
      let record = payload.new;
      let skills = record["skills"];
      let talents = record["talents"];
      let description = record["description"];
      let username = record["username"];

      if (description != "") {
        console.log('Description already exists:', description)
        return;
      }

      if (payload_event === 'INSERT' || payload_event === 'UPDATE') {
        // run the AI model on the record using mistral.py
        console.log('New record:', record);
        let results = "";
        run_model("You are an AI assistant that reads a username, a list of skills, and a list of talents. You are to describe the user in your own words.", 
          username, skills, talents)
          .then((response) => {
            console.log('Response:', response);
            results = response || "";

            // update the record in the database
            client
            .from("UserData")
            .update({ description: results })
            .match({ user_id: record["user_id"] })
            .then((response) => {
              console.log('Response:', response);
            })
          });

        
      }
    }
    if (payload.table === "board_ticket_data") {
      let payload_event = payload.eventType;
      let record = payload.new;
      console.log('board_ticket_data:');

      if (record["to_generate"] === false) {
        console.log('Description already exists:', record["description"])
        return;
      }

      if (payload_event === 'INSERT' || payload_event === 'UPDATE') {
        // run the AI model on the record using mistral.py
        console.log('New record:', record);
        let results = "";
        run_model_ticket(`You are an AI assistant that reads a Ticket Summary of a ticket a user is trying to make. You are to make a short title and a longer description of this ticket. The description should have a list of action items to complete. You will output JSON, with "Title" and "Description" being the JSON tags. The Description should also be in html formatting.`, 
          record["description"])
          .then((response) => {
            console.log('Response:', response);
            results = response || "";

            // parse the JSON results
            let json_results = JSON.parse(results);
            let title = json_results["Title"];
            let description = json_results["Description"];

            // update the record in the database
            client
            .from("board_ticket_data")
            .update({ title: title, description: description, to_generate: false})
            .match({ ticket_id: record["ticket_id"], board_id: record["board_id"]})
            .then((response) => {
              console.log('Response:', response);
            })
          }
        );
      }
    }
  }
)
.subscribe()

//console.log(channel);

// export the module
export default {};