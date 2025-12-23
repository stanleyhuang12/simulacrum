import type { RequestHandler } from './$types';
import { json, error, text } from '@sveltejs/kit';
import { validateAndRetrieveDeliberation, updateDeliberationRecord } from "$db/+server";
import { hydrateDeliberationInstance } from '$models/+deliberations';
/* GET request will retrieve the DeliberationORM object if it exists in the database  */


export const POST: RequestHandler = async ( {cookies, request} ) => {
    const userID = await cookies.get('session-id-delibs'); 
    const input = await request.text(); 
    console.log(userID)
    console.log(input)

    try { 
        const deliberationRecord = await validateAndRetrieveDeliberation(userID)
        if (deliberationRecord == null ) { return error(404, "No deliberation error found.")}
        const deliberationInstance = hydrateDeliberationInstance(deliberationRecord)
        const response = await deliberationInstance.panel_discussion(input)
        await updateDeliberationRecord( deliberationRecord, await deliberationInstance.lawmaker._retrieve_deserialized_memory() )
        console.log('Deliberation record in PostgreSQL updated!')
        return text(response, { status: 200 });

    } catch(err) {
        console.error(`Error retrieving Deliberation instance from PostgreSQL database, ${err}`)
        return error(500, `${err}`)
    }
}; 
