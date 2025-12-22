import type { RequestHandler } from './$types';
import { json, error, redirect } from '@sveltejs/kit';
import { DeliberationORM } from "$db/+server";


/* GET request will retrieve the DeliberationORM object if it exists in the database  */

export const POST: RequestHandler = async ( {cookies, request} ) => {
    const userID = await cookies.get('session-id-delibs'); 
    const res = await request.formData(); 
    
    if (!userID) { 
        redirect(400, "/form")
    }

    try {
        await DeliberationORM.create(
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
    } catch(err: any) { 
        return error(500, `Deliberation event not create in PostgreSQL ${err}`)
    }

    console.log('Deliberation event created in PostgreSQL!')
    return json( { userID }, { status: 201 });
}; 
