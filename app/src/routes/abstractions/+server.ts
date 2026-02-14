
import type { PageServerLoad } from "../form/$types";
import { validateAndRetrieveDeliberation } from "$db/+server";
import { redirect } from "@sveltejs/kit";
import { hydrateDeliberationInstance } from "$models/+deliberations";


export const load: PageServerLoad =  async ( {cookies} ) => {
    const sessCookies = cookies.get('session-id-delibs'); 

    const dRecord = await validateAndRetrieveDeliberation(sessCookies)    
    if (dRecord == null) {
        console.groupEnd()
        redirect(308, "/")
    }

    const d = hydrateDeliberationInstance(dRecord)
    return {
        "memory": d._memory
    }

}