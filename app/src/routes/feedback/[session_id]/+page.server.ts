import type { PageServerLoad } from "./$types";

export const load: PageServerLoad =  async ( {params} ) => {
    console.log("Running load function for feedback")
    console.log(params) 
    const cookieStr = params.session_id;
    console.log(cookieStr)
    const match = cookieStr.match(/session-delibs-id=([^;]+)/);
    const sess_cookies = match ? match[1] : null;
    console.log(sess_cookies);
    
    return { 
        sess_cookies: sess_cookies
    }
}