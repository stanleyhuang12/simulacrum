import { OPENAI_API_KEY } from '$env/static/private';
import type { RequestHandler } from '@sveltejs/kit';
import { json, error } from '@sveltejs/kit';

export const GET: RequestHandler = async () => {
    return new Response("This is a vanilla text/chat completions API call.");
}; 

export const POST: RequestHandler = async( {request} ) => {
    try {
        const agentResponse = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENAI_API_KEY}`,
            },
            body: await request.json()
        })
        
        const res = await agentResponse.json();
    } catch(err) {

    }
    return json("hi")
}