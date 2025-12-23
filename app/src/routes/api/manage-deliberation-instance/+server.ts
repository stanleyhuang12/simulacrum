import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { DeliberationORM, sequelize, validateAndRetrieveDeliberation } from "$db/+server";
import { hydrateDeliberationInstance } from '$models/+deliberations';
/* GET request will retrieve the DeliberationORM object if it exists in the database  */


export const POST: RequestHandler = async ( {cookies, request} ) => {
    const userID = await cookies.get('session-id-delibs'); 
    const input = await request.text(); 
    console.log(userID)
    console.log(input)

    try { 
        const deliberationRecord = await validateAndRetrieveDeliberation(userID)
        const deliberationInstance = hydrateDeliberationInstance(deliberationRecord)
        const response = deliberationInstance.lawmaker.process(input)


        /* Rehydrating database back into object object */
        

    } catch(err) {
        console.error(`Error retrieving Deliberation instance from PostgreSQL database, ${err}`)
        return error(500, `${err}`)
    }

    console.log('Deliberation event created in PostgreSQL!')
    return json( { userID }, { status: 201 });
}; 
