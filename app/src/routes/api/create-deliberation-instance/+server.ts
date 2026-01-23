import type { RequestHandler } from './$types';
import { json, error, redirect } from '@sveltejs/kit';
import { DeliberationORM } from "$db/+server";
import { Deliberation } from "$models/+deliberations"

/* GET request will retrieve the DeliberationORM object if it exists in the database  */

export const POST: RequestHandler = async ( {cookies, request} ) => {
    const userID = await cookies.get('session-id-delibs'); 
    const res = await request.json(); 
    console.log(userID)
    console.log(res)
    
    const d = new Deliberation(
        res.username,
        res.organization,
        "deliberations",
        res.policy_topic,
        res.state, // make sure res.state exists
        1,
        res.ideology,
        res.lawmaker_name,
        new Date(),
        new Date(),
    );

    try {
        const created = await DeliberationORM.create(
        {
            username: d._username, 
            unique_id: userID, 
            organization: d._group,
            state: d.state,
            policy_topic: d.policy_topic,
            ideology: d.ideology,
            lawmaker_name: d.lawmaker_name,
            degree_of_support: d.lawmaker.degree_of_support,
            persona: d.lawmaker.persona,
            conversation_turn: d.conversation_turn,
            /* No discussion history because this is initialization*/
        }
    ) 
        console.log('Created deliberation:', created.toJSON());
        console.log('===========================');
    } catch(err: any) { 
        console.log("Database error")
        return error(500, `Deliberation event not create in PostgreSQL ${err}`)
    }

    console.log('Deliberation event created in PostgreSQL!')
    return json( { userID }, { status: 201 });
}; 
