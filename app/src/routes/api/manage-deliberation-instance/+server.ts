import type { RequestHandler } from './$types';
import { json, error, text } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { validateAndRetrieveDeliberation, updateDeliberationRecord } from '$db/+server';
import { hydrateDeliberationInstance } from '$models/+deliberations';
/* GET request will retrieve the DeliberationORM object if it exists in the database  */


export const POST: RequestHandler = async ( event ) => {
    const userID = await event.cookies.get('session-id-delibs'); 
    const input = await event.request.text(); 
    console.log(userID)
    console.log(input)

    try { 
        const delibsRecord = await validateAndRetrieveDeliberation(userID)
         
        if (delibsRecord?.getDataValue('guardrail_tripwire')){
            event.cookies.set('session-id-delibs', event.cookies.get('session-id-delibs')!, {
                path: '/',
                httpOnly: true,
                sameSite: 'lax',
                maxAge: 7 * 24 * 60 * 60 
            });
            redirect(403, 'forbidden')
        }

        if (delibsRecord == null ) { return error(404, "No deliberation object found.")}
        const d = hydrateDeliberationInstance(delibsRecord)
        console.log(d.conversation_turn); 

        if (d.conversation_turn === 2) {
            console.log("Running guardrail functions")
            let guardrailResponse = await d._guardrail_moderation(input)
            console.log(`Guardrail response ${guardrailResponse}`)
            if (guardrailResponse.triggered) {
                return json({
                    type: 'guardrail.triggered',
                    reason: guardrailResponse.reason
                }, {status: 504, statusText: "Your session has ended abruptly due to guardrails put in place. Please contact the team to retry application use."})
            }
        }

        const response = await d.panel_discussion(input, event.fetch)
        console.log(response)
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
