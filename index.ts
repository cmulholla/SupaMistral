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
async function run_model(prompt: string, username: string, skills: string, talents: string) {
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
      { role: "user", content: ticket_summary},
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


    if (payload.table === "boards") {
      let payload_event = payload.eventType;
      let record = payload.new;

      if (payload_event === 'INSERT') {
        // run the AI model on the record using mistral.py
        console.log('New record:', record);
        let results = "";

        // run the AI model using GPT-3 to generate a list of assignments for a language board, where the board name is the language name.
        run_model_ticket(`You are an AI assistant who helps make assignments for a language learning board. You are to make a list of 7 assignment titles for this board in English, where the description for each assignment will be created at a later time. These assignments should all be about a specific subject within the language. The input will be the name of the board, which will be the name of the language, and a given user proficiency out of 10, which will determine how hard the assignments are for this user. You will output JSON, with "TitleX" being the JSON tag per each title, and X being the number of title (ex. Title1). Do not wrap the JSON in anything, simply output a single JSON block.`,
          record["name"] + ", " + record["proficiency"])
          .then((response) => {
            console.log('Response:', response);
            results = response || "";

            // parse the JSON results with multiple Titles
            let json_results = JSON.parse("{}");
            try {
              json_results = JSON.parse(results);
            }
            catch (e) {
              try {
                json_results = JSON.parse("{" + results + "}");
              }
              catch (e) {
                console.log('Error parsing JSON:', e);
              }
              return;
            }
            
            console.log('Titles:', json_results);

            // iterate through the json_results and generate descriptions using AI from the titles
            for (let title in json_results) {
              title = json_results[title];
              run_model_ticket(`You are an AI assistant that reads a title of a small, basic assignment, as well as the proficiency level of the user out of 10. You are to make a longer description of this assignment, which should take around an hour for a user of the proficiency to complete. The description should have a list of action items to complete. The output should only be in html formatting, with no other formatting.`,
              record["name"] + ", " + title + ", " + record["proficiency"])
                .then((response) => {
                  console.log('Response:', response);
                  let description = response;

                  // insert the record into the database
                  client
                  .from("board_ticket_data")
                  .insert({ board_id: record["id"], title: title, description: description, assignee_id: "", status_column: "To Do", to_generate: false})
                  .then((response) => {
                    console.log('Response:', response);
                  })
                }
              );
            }
          }
        );
      }
    }

    if (payload.table === "board_ticket_data") {
      let payload_event = payload.eventType;

      let record: {} = {};
      let boardid: any;
      if (payload_event === 'INSERT' || payload_event === 'UPDATE') {
        record = payload.new;
      }
      else if (payload_event === 'DELETE') {
        record = payload.old;
      }
      else {
        return;
      }
      console.log('board_ticket_data:');
      boardid = record["board_id"];
      let originalRecord = record;

      // get all the records from supabase's board_ticket_data, and check if there are any more tickets in the To Do column for this board.
      client
      .from("board_ticket_data")
      .select("*")
      .eq("board_id", boardid)
      .eq("status_column", "To Do")
      .then((response) => {
        console.log('Deleted ticket');
        let tickets = response.data || [];

        // if there are no more tickets in the To Do column, then generate a new set of tickets
        if (tickets.length === 0) {
          let new_proficiency = 0;
          // run the AI model on the record using mistral.py
          console.log('Response:', response);
          let results = "";

          // update the proficiency based on the past 7 assignment's grades
          let proficiency = 0;
          // get the past 7 assignments
          client
          .from("board_ticket_data")
          .select("*")
          .eq("board_id", boardid)
          .eq("status_column", "Done")
          .order("created_at", {ascending: false})
          .limit(7)
          .then((response) => {
            console.log('Response:', response);
            let assignments = response.data || [];
            let total = 0;
            for (let assignment of assignments) {
              total += assignment["grade"];
              console.log("grade: " + assignment["grade"])
            }
            proficiency = total / 7;

            // get the current proficiency of the board
            client
            .from("boards")
            .select("*")
            .eq("id", boardid)
            .then((response) => {
              console.log('Response length: ', response.data?.length);
              let board = response.data || [];
              if (board.length > 0) {
                // add up to 0.5 and down to -0.5 to the proficiency, with a max of 10 and a min of 0
                new_proficiency = board[0]["proficiency"] + (proficiency - 5) / 10;
                console.log("new_proficiency: " + new_proficiency)
                if (new_proficiency > 10) {
                  new_proficiency = 10;
                }
                else if (new_proficiency < 0) {
                  new_proficiency = 0;
                }
                console.log("new_proficiency: " + new_proficiency)
                
                // update the proficiency of the board
                client
                .from("boards")
                .update({ proficiency: new_proficiency })
                .eq("id", boardid)
                .then((response) => {
                  if (response["status"] === 204) {
                    console.log('Updated proficiency');
                  }
                  else {
                    console.log('Failed to update proficiency');
                  }
                });
              }
            });
          });

          // run the AI model using GPT-3 to generate a list of assignments for a language board, where the board name is the language name.
          let assignment_amount = 7;
          run_model_ticket(`You are an AI assistant who helps make assignments for a language learning board. You are to make a list of ${assignment_amount} assignment titles for this board in English, where the description for each assignment will be created at a later time. These assignments should all be about a specific subject within the language. The input will be the name of the board, which will be the name of the language, and a given user proficiency out of 10, which will determine how hard the assignments are for this user. You will output JSON, with "TitleX" being the JSON tag per each title, and X being the number of title (ex. Title1). Do not wrap the JSON in anything, simply output a single JSON block.`,
            record["name"] + ", " + new_proficiency)
            .then((response) => {
              console.log('Response:', response);
              results = response || "";

              // parse the JSON results with multiple Titles
              let json_results = JSON.parse("{}");
              try {
                json_results = JSON.parse(results);
              }
              catch (e) {
                try {
                  json_results = JSON.parse("{" + results + "}");
                }
                catch (e) {
                  console.log('Error parsing JSON:', e);
                }
                return;
              }
              
              console.log('Titles:', json_results);

              // iterate through the json_results and generate descriptions using AI from the titles
              for (let title in json_results) {
                title = json_results[title];
                run_model_ticket(`You are an AI assistant that reads a title of a small, basic assignment, as well as the proficiency level of the user out of 10. You are to make a longer description of this assignment, which should take around an hour for a user of the proficiency to complete. The description should have a list of action items to complete. The output should only be in html formatting, with no other formatting.`,
                record["name"] + ", " + title + ", " + new_proficiency)
                  .then((response) => {
                    console.log('Response:', response);
                    let description = response;

                    // insert the record into the database
                    client
                    .from("board_ticket_data")
                    .insert({ board_id: boardid, title: title, description: description, assignee_id: "", status_column: "To Do", to_generate: false})
                    .then((response) => {
                      console.log('Response:', response);
                    })
                  }
                );
              }
            }
          );
        }
      });

      // set the record back to the original record in case the original values got overwritten
      record = originalRecord;

      // if the ticket is in the Done column, and the to_generate flag is set to true, then the ticket needs grading
      if (record["status_column"] === "Done" && record["to_generate"]) {
        // run the AI model on the record using mistral.py
        console.log('Record:', record);
        let results = "";

        // run the AI model using GPT-3 to generate a grade for the assignment
        run_model_ticket(`You are an AI assistant that reads a description of a small basic assignment, the user's input, and the proficiency level of the user out of 10. You are to grade this assignment based on the user's proficiency level. The input will be the name of the board, which will be the name of the language, the description of the assignment, and the user's proficiency out of 10. The output should simply be a number from 1 to 10, with 1 being the worst grade and 10 being the best grade. Do not answer with anything other than the grade, as that would break my system.`,
          record["description"] + "\nproficiency: " + record["proficiency"])
          .then((response) => {
            console.log('Response:', response);
            results = response || "";

            // insert the record into the database
            client
            .from("board_ticket_data")
            .update({ grade: results, to_generate: false })
            .eq("ticket_id", record["ticket_id"])
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