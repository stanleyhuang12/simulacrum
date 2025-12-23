import type { PageServerLoad } from "./$types";
import { redirect } from "@sveltejs/kit";
import { validateAndRetrieveDeliberation } from "$db/+server";

export const load: PageServerLoad =  async ( {cookies} ) => {
    console.log("Running load function for feedback")
    const sess_cookies = cookies.get('session-id-delibs'); 
    console.log(sess_cookies);

    const deliberationRecord = await validateAndRetrieveDeliberation(sess_cookies)
    
    if (deliberationRecord == null) {
        redirect(308, "/")
    }

    const savedMemory = deliberationRecord.toJSON().memory
    return { 
        memory: savedMemory,
        sess_cookies: sess_cookies
    }
    
}