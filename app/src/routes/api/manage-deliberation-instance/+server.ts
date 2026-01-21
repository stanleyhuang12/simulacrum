import type { RequestHandler } from './$types';
import { json, error, text } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { validateAndRetrieveDeliberation, updateDeliberationRecord } from '$db/+server';
import { hydrateDeliberationInstance } from '$models/+deliberations';
/* GET request will retrieve the DeliberationORM object if it exists in the database  */


export const POST: RequestHandler = async ( event ) => {
    const userID = await event.cookies.get('session-id-delibs'); 
    const sessionId = event.cookies.get('session-id-delibs'); 
    if (!sessionId) throw error(401, 'Missing session-id-delibs')
    const input = await event.request.text(); 
    console.log(userID)
    console.log(input)
 
    try { 
        const delibsRecord = await validateAndRetrieveDeliberation(userID)
        if (delibsRecord == null) 
            { return error(404, "No deliberation object found.")}

        if (delibsRecord?.getDataValue('guardrail_tripwire')){
           event.cookies.set(
            'session-id-delibs', 
            sessionId, {
                 path: '/', 
                 httpOnly: true, 
                 sameSite: 'lax', 
                 maxAge: 72460*60 
                }
            )
        }

        const d = hydrateDeliberationInstance(delibsRecord)

        if (d.conversation_turn === 3 || d.conversation_turn % 3 === 0) {
            console.log("Running guardrail functions")
            let guardrailResponse = await d._guardrail_moderation(input)
            console.log(`Guardrail response ${JSON.stringify(guardrailResponse)}`)
            if (guardrailResponse.triggered) {
                return json({
                    type: 'guardrail.triggered',
                    reason: guardrailResponse.reason
                }, {status: 403, statusText: "Your session has ended abruptly due to guardrails put in place. Please contact the team to retry application use."})
            }
        }

        const response = await d.panel_discussion(input, event.fetch)
        console.log(response)
        await updateDeliberationRecord( delibsRecord, d, d.lawmaker._retrieve_deserialized_memory() )
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
