
import type { PageServerLoad } from "../form/$types";
import { validateAndRetrieveDeliberation } from "$db/+server";
import { redirect } from "@sveltejs/kit";
import { hydrateDeliberationInstance } from "$models/+deliberations";


export const load: PageServerLoad =  async ( event ) => {
    console.log("Running load function for branch retry")
    const sessCookies = event.cookies.get('session-id-delibs'); 
    
    // const dRecord = await validateAndRetrieveDeliberation(sessCookies)    
    // if (dRecord == null) {
    //     console.groupEnd()
    //     redirect(308, "/")
    // }
    // const d = hydrateDeliberationInstance(dRecord)
    return { 
        sessCookies: sessCookies,
        isDemo: event.url.searchParams.get('demo') === "true", 
    }
}