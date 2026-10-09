import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';

export const GET: RequestHandler = async () => {
    return new Response("Speech to text API endpoint requires a POST request.");
}; 


export const POST: RequestHandler = async ( {request} ) => {

    console.group("Speech-to-text transcription handler.")

    const formData = await request.formData()
    const file = formData.get('file');
    console.log("Received file details:", {
            exists: !!file,
            type: file instanceof File ? file.type : 'Not a File',
            size: file instanceof File ? file.size : 'Unknown',
            name: file instanceof File ? file.name : 'Unknown'
    });

    try {
        const agentResponse = await fetch("https://api.openai.com/v1/audio/transcriptions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
            },
            body: formData
        })
        
        const res = await agentResponse.text();
        
        console.log(res);
        console.groupEnd();
        if (!res) return error(400,`Transcription error found: ${res}`);
        return json({
            "transcriptions": res, 
            "success": true
        });

    } catch(err) {
        return error(400,`Transcription error found: ${err}`);
    };
};