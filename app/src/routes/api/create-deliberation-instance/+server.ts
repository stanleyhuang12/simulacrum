import type { RequestHandler } from './$types';
import { json, error, redirect } from '@sveltejs/kit';
import { DeliberationORM } from "$db/+server";


/* GET request will retrieve the DeliberationORM object if it exists in the database  */

export const POST: RequestHandler = async ( {cookies, request} ) => {
    const userID = await cookies.get('session-id-delibs'); 
    const res = await request.json(); 
    console.log(userID)
    console.log(res)
    try {
        await DeliberationORM.create(
        {
            username: res.username, 
            unique_id: userID, 
            organization: res.organization,
            state: res.state,
            policy_topic: res.policy_topic,
            ideology: res.ideology,
            lawmaker_name: res.lawmaker_name,

            /* No discussion history because this is initialization*/
        }
    ) 
    } catch(err: any) { 
        return error(500, `Deliberation event not create in PostgreSQL ${err}`)
    }

    console.log('Deliberation event created in PostgreSQL!')
    return json( { userID }, { status: 201 });
}; 
