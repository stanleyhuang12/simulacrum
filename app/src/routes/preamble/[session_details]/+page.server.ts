import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = async (event) => { 

    const sess_cookies = event.cookies.get('session-id-delibs');
    console.log(sess_cookies)

    //decode URI of JSON string of payload 
    const uriData = event.url.searchParams.get("data");
    const form = uriData ? JSON.parse(decodeURIComponent(uriData)) : null; 
    const response = await event.fetch("/api/instantiate-lawmaker-avatar", {
        method: "POST", 
        body: JSON.stringify(form)
        }
    )
    console.log(form)


    const imageGenerationObject = await response.json()

    if (form != null) { 
        return {
            form: form,
            imageGenerationObject: imageGenerationObject,
            sess_cookies: sess_cookies,
            status: 200
        }
    }

    else return { status: 500 }
}