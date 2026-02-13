import type { PageServerLoad } from "./$types";
import { redirect } from "@sveltejs/kit";
import { validateAndRetrieveDeliberation } from "$db/+server";

export const load: PageServerLoad =  async ( {cookies} ) => {
    /*
    Data load function for Feedback agent mapper, synthesis, and generation. 
    The load function retrieves the session cookies, fetches records from the server, 
    and stores the dialogue. 
    */
    console.log("Running load function for feedback")
    const sessCookies = cookies.get('session-id-delibs'); 
    console.log(sessCookies);

    const deliberationRecord = await validateAndRetrieveDeliberation(sessCookies)
    
    if (deliberationRecord == null) {
        redirect(308, "/")
    }
    
    console.log(deliberationRecord.toJSON())
    const savedMemory = deliberationRecord.toJSON().memory
    return { 
        memory: savedMemory,
        sess_cookies: sessCookies
    }
    
}