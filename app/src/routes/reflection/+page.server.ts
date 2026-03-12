import type { PageServerLoad } from "./$types";
import { redirect } from "@sveltejs/kit";


export const load: PageServerLoad = async ( event ): Promise<({userID: string})> => {
    const userID = event.cookies.get("session-id-delibs");
    const isDemo = event.url.searchParams.get('demo') == "true"; 
    if (!userID) { 
        if (isDemo) { return {userID: "demo-key"} } else { throw redirect(404, "/form") }
    }

    return {userID: userID}; 
}