import { OPENAI_API_KEY } from '$env/static/private';
import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';

export const GET: RequestHandler = async () => {
    return new Response();
}; 


export const POST: RequestHandler = async ( {request} ) => {

    //resolve into form data 
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