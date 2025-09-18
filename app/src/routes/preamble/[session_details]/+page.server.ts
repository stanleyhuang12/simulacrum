import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = async ({ params, url }) => { 
    //get cookie data 
    const cookieStr = params.session_details;
    const match = cookieStr.match(/session-id-delibs=([^;]+)/);
    const sess_cookies = match ? match[1] : null;
    console.log(sess_cookies)

    //decode URI of JSON string of payload 
    const uriData = url.searchParams.get("data");
    const form = uriData ? JSON.parse(decodeURIComponent(uriData)) : null; 
    console.log(form)

    if (form != null) { 
        return {
            form: form,
            sess_cookies: sess_cookies,
            status: 200
        }
    }
    else return { status: 500 }
}