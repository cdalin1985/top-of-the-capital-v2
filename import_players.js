const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// These will be pulled from your ENV or I'll ask for them if needed
// But since I'm running this locally, I can use the ones I found in your config
const SUPABASE_URL = 'https://ankvjywsnydpkepdvuvm.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY is not set.');
    console.log('Please run: $env:SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"; node import.js');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function importPlayers() {
    const sql = fs.readFileSync(path.join(__dirname, 'supabase/migrations/20260103000000_import_players.sql'), 'utf8');
    
    // We wrap the SQL in a RPC call or use the REST API to execute it
    // However, the best way for a data import is to use the supabase client directly
    console.log('Starting player import...');
    
    const { data, error } = await supabase.rpc('execute_sql', { sql_query: sql });
    
    if (error) {
        console.error('Error executing SQL:', error);
    } else {
        console.log('Successfully imported all 70 players!');
    }
}

// Since execute_sql might not be enabled, let's use the safer direct table insert
async function directImport() {
    const players = [
        { name: 'Dan Hamper', rating: 637 }, { name: 'Frank Kincl', rating: 626 },
        { name: 'David Smith', rating: 616 }, { name: 'Mike Paliga', rating: 586 },
        { name: 'Dave Alderman', rating: 580 }, { name: 'Josh Fava', rating: 572 },
        { name: 'Timmy Squires', rating: 558 }, { name: 'Chase Dalin', rating: 540 },
        { name: 'Randy Hoag', rating: 512 }, { name: 'Jerry Sabol', rating: 502 },
        { name: 'Kurt Kubicka', rating: 492 }, { name: 'Zach Ledesma', rating: 492 },
        { name: 'Steve Adsem', rating: 487 }, { name: 'Walter Ryan Isenhour', rating: 478 },
        { name: 'Nate Welch', rating: 476 }, { name: 'Thomas E. Kingston', rating: 475 },
        { name: 'Mike Zahn', rating: 473 }, { name: 'Christina Talbot', rating: 469 },
        { name: 'Josh Hill', rating: 455 }, { name: 'Matt Gilbert', rating: 450 },
        { name: 'Sarah Urbaniak VanCleave', rating: 447 }, { name: 'Jesse Chandler', rating: 444 },
        { name: 'Anthony Jacobs', rating: 440 }, { name: 'Joel Selzer', rating: 429 },
        { name: 'Jon Nash', rating: 418 }, { name: 'Joe Mackay', rating: 417 },
        { name: 'Marc Sanche', rating: 413 }, { name: 'James Ellington', rating: 408 },
        { name: 'Walker Hopkins', rating: 407 }, { name: 'Troy Jacobs', rating: 403 },
        { name: 'Tizer Rushford', rating: 401 }, { name: 'George Cotton', rating: 399 },
        { name: 'Keenen Blackbird', rating: 388 }, { name: 'Janice Osborne', rating: 378 },
        { name: 'Chris Gomez', rating: 372 }, { name: 'Josh Waples', rating: 369 },
        { name: 'Sady Garrison', rating: 329 }, { name: 'Kelly Smail', rating: 303 },
        { name: 'Makayla Ledford', rating: 294 }, { name: 'Heather Jarvis', rating: 293 },
        { name: 'Samantha Chase', rating: 241 }, { name: 'Courtney Norman', rating: 230 },
        { name: 'Steven Ross Brandenburg', rating: -90 }, { name: 'Tim Webster', rating: 0 },
        { name: 'Eric Croft', rating: 0 }, { name: 'Louise Broksle', rating: 0 },
        { name: 'Vern Carpenter', rating: 0 }, { name: 'Mike Churchill', rating: 0 },
        { name: 'Gurn Blanston', rating: 0 }, { name: 'Rob Millions', rating: 0 },
        { name: 'Patrick Donald', rating: 0 }, { name: 'Tim Gregor', rating: 0 },
        { name: 'James McMasters', rating: 0 }, { name: 'James Smith', rating: 0 },
        { name: 'Lea Hightshoe', rating: 0 }, { name: 'Kenny Thurman', rating: 0 },
        { name: 'Roger Simmons', rating: 0 }, { name: 'Justin Cavazos', rating: 0 },
        { name: 'Sean Royston', rating: 0 }, { name: 'Clayton Carter', rating: 0 },
        { name: 'Ryan Fields', rating: 0 }, { name: 'Kris Vladic', rating: 0 },
        { name: 'Jennifer Lynn', rating: 0 }, { name: 'Justin Whittenberg', rating: 0 },
        { name: 'Kenrick Leistiko', rating: 0 }, { name: 'Richard Frankforter', rating: 0 },
        { name: 'Brandon Lucas Parker', rating: 0 }, { name: 'Anita Scharf', rating: 0 },
        { name: 'Ileana Hernandez', rating: 0 }
    ];

    // Sorting by rating
    players.sort((a, b) => b.rating - a.rating);

    console.log(`Inserting ${players.length} players...`);
    
    for (let i = 0; i < players.length; i++) {
        const { error } = await supabase
            .from('profiles')
            .insert({
                display_name: players[i].name,
                fargo_rating: players[i].rating,
                spot_rank: i + 1
            });
        
        if (error) console.error(`Error inserting ${players[i].name}:`, error.message);
        else console.log(`[${i+1}/70] Imported ${players[i].name}`);
    }
}

directImport();
