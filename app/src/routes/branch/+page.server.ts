
import type { PageServerLoad } from "../form/$types";
import { validateAndRetrieveDeliberation } from "$db/+server";
import { redirect } from "@sveltejs/kit";
import { hydrateDeliberationInstance } from "$models/+deliberations";


export const load: PageServerLoad =  async ( {cookies} ) => {
    console.group()
    console.log("Running load function for branch retry")
    
    const sessCookies = cookies.get('session-id-delibs'); 
    const userInitiateRetryBranch = cookies.get('session-delibs-branch-retrial');

    const dRecord = await validateAndRetrieveDeliberation(sessCookies)    
    if (dRecord == null) {
        console.groupEnd()
        redirect(308, "/")
    }

    const d = hydrateDeliberationInstance(dRecord)

    if (userInitiateRetryBranch) {
        const retryBranches = JSON.parse(userInitiateRetryBranch);
        console.log("Branches to retry", retryBranches);
        for (const branchIndex of retryBranches) {
            const { prompt, startTime } = d.unwindTrialBranch(branchIndex)
            localStorage.setItem(branchIndex, JSON.stringify({prompt, startTime}))
        }
    }
    /*
    The goal is to retrieve a subset of memory  
    */
    
    return { 
        sessCookies: sessCookies,
    }
    
}