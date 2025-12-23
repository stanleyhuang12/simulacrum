// src/routes/interface/+page.server.ts
import { redirect } from '@sveltejs/kit';
import { validateAndRetrieveDeliberation } from '$db/+server';
import type { PageServerLoad } from "./$types";


export const load: PageServerLoad = async( {cookies} )=>{
    const sess_cookies = cookies.get('session-id-delibs');
    const deliberationObject = await validateAndRetrieveDeliberation(sess_cookies)
    
    console.log(sess_cookies)
    console.log(deliberationObject)

    if (deliberationObject == null) {
        // No session cookie detected or match with PostgreSQL DB, redirect to login or show error
        throw redirect(303, '/form');
    }
    return {sess_cookies: sess_cookies}; 

    // Need transport hooks if we are going to load arbitrary non-POJOS data
}