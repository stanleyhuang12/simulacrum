import { OPENAI_API_KEY } from '$env/static/private';
import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';

export const GET: RequestHandler = async () => {
    return new Response("Speech to text API endpoint requires a POST request.");
}; 


async function validateUser(sess_cookies: string) {
    const isUserValidated = await fetch("/trial-v1/delibs/retrieve-end-of-call-transcript-and-feedback", {
        headers: {
            "Cookies": `session_id_delibs=${sess_cookies}`
        }
    })
    if (!isUserValidated.ok) {
        return 
    }
}



export const POST: RequestHandler = async ( {request, cookies} ) => {

    console.log("Triggered stt POST request.")

    const sess_cookies = cookies.get("session-id-delibs")

    // Validate user has initialized a Deliberation structure 
    const isUserValidated = await fetch("/trial-v1/delibs/retrieve-end-of-call-transcript-and-feedback", {
        headers: {
            "Cookies": `session_id_delibs=${sess_cookies}`
        }
    })
    if (!isUserValidated.ok) return error(isUserValidated.status, isUserValidated.statusText); 

    const formData = await request.formData();
    try {
        const agentResponse = await fetch("https://api.openai.com/v1/audio/transcriptions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENAI_API_KEY}`,
            },
            body: formData
        })
        
        const res = await agentResponse.text();
        
        console.log(res);
        if (!res) return json({"transcriptions": null, "success": false});
        
        //json is a helper function that returns a Response object with header "applications/json"
        return json({
            "transcriptions": res, 
            "success": true
        });

    } catch(err) {
        console.error(err)
        return json({"transcriptions": null, "success": false})
    };
};