import type { RequestHandler } from './$types';
import { json, error, redirect } from '@sveltejs/kit';
import { sequelize, DeliberationORM } from "$db/+server";


/* GET request will retrieve the DeliberationORM object if it exists in the database  */

export const POST: RequestHandler = async ( {cookies, request} ) => {
    const userID = cookies.get('session-id-delibs'); 
    const res = await request.formData(); 
    
    if (!userID) { 
        redirect(400, "/form")
    }

    const deliberation = await DeliberationORM.create(
        {
            username: res.get('username'), 
            unique_id: userID, 
            organization: res.get('organization'),
            state: res.get('state'),
            policy_topic: res.get('policy_topic'),
            ideology: res.get('ideology'),
            lawmaker_name: res.get('lawmaker_name'),
            /* No discussion history because this is initialization*/
        }
    )

    console.log('Deliberation event created in PostgreSQL!')
    
    
    return new Response("This is a vanilla text/chat completions API call.");
}; 
