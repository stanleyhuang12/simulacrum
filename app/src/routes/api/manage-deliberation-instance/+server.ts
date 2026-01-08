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
        const delibsRecord = await validateAndRetrieveDeliberation(userID)
        if (delibsRecord == null ) { return error(404, "No deliberation object found.")}
        const d = hydrateDeliberationInstance(delibsRecord)

        if (d.conversation_turn === 2) {
            let guardrailResponse = await d._guardrail_moderation(input)
            if (guardrailResponse.triggered) {
                return json({
                    type: 'guardrail.triggered',
                    reason: guardrailResponse.reason
                }, {status: 504, statusText: "Your session has ended abruptly due to guardrails put in place. Please contact the team to retry application use."})
            }
        }

        const response = await d.panel_discussion(input)
        await updateDeliberationRecord( delibsRecord, d, await d.lawmaker._retrieve_deserialized_memory() )
        console.log('Deliberation record in PostgreSQL updated!')
        
        return json({
            type: 'automated.response', 
            response: response}, 
            { 
                status: 200
             }
        );
    } catch(err) {
        console.error(`Error retrieving Deliberation instance from PostgreSQL database, ${err}`)
        return error(500, `${err}`)
    }
}; 
