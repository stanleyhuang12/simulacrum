//****Server-side code for transcriptions*****/

import { json } from "@sveltejs/kit";

export async function POST( {request} ) {
    const formData = request.formData()
    try {
    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${import.meta.env.OPENAI_API_KEY}`,
        },
        body: formData})
    const result = await response.json()
    return json(result.text)
    } catch(err) {
        console.error("Internal server endpoint has error with transcription services.")
    }

};