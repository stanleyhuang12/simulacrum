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



export const POST: RequestHandler = async ( {request} ) => {

    console.group("Speech-to-text transcription handler.")

    // const file = formData.get('file');
    // console.log("Received file details:", {
    //         exists: !!file,
    //         type: file instanceof File ? file.type : 'Not a File',
    //         size: file instanceof File ? file.size : 'Unknown',
    //         name: file instanceof File ? file.name : 'Unknown'
    // });

    try {
        const agentResponse = await fetch("https://api.openai.com/v1/audio/transcriptions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENAI_API_KEY}`,
            },
            body: await request.formData()
        })
        
        const res = await agentResponse.json();
        
        console.log(res);
        console.groupEnd();

        if (!res) return json({"transcriptions": null, "success": false});
        

        //json is a helper function that returns a Response object with header "applications/json"
        return json({
            "transcriptions": res, 
            "success": true
        });


    } catch(err) {
        console.error("Speech-to-text failed", err)
        return json({"transcriptions": null, "success": false})
    };
};