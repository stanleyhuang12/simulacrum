
import type { PageServerLoad } from "../form/$types";
import { validateAndRetrieveDeliberation } from "$db/+server";
import { redirect } from "@sveltejs/kit";
import { hydrateDeliberationInstance } from "$models/+deliberations";


export const load: PageServerLoad =  async ( {cookies} ) => {
    /*
    Retrieves a subset of the conversation threads that user wants to retry. 
    This load function uses local storage to store 
        (1) the conversation ID or branch ID to diverge as key
        (2) the value as a string representation of an object { dialogue, startTime }
            dialogue: { prompt: # prompt, response: # response }; note that we are creating a divergent branch by "overwriting" the response
            startTime: Date; the initial time when the user previously responded to the virtual lawmaker. Simulate unwinding time. 
    
    This load function returns 
        (1) the session cookies or UUID to match user and 
        (2) a parseable string representation of the different conversation threads to create divergent branches
    */ 
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
            const { dialogue, startTime } = d.unwindTrialBranch(branchIndex)
            localStorage.setItem(branchIndex, JSON.stringify({dialogue, startTime}))
        }
    }
  
    return { 
        sessCookies: sessCookies,
        retryBranches: userInitiateRetryBranch,
    }
    
}