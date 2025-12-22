import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = async ({ cookies, url }) => { 
    const sess_cookies = cookies.get('session-id-delibs');
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