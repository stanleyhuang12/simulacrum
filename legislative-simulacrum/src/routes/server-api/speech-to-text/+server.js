//****Server-side code for transcriptions*****/

import { json } from "@sveltejs/kit";

export const GET = ({}) => {
    return new Response('works');
}

export async function POST( {request} ) {
    console.log("private SSR func stt..")
    const formData = request.formData()
    try {
    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${import.meta.env.OPENAI_API_KEY}`,
        },
        body: formData})

    console.log("Submitted CURL request OpenAI's transcription API.")
    const result = await response.json()
    return json(result.text)
    } catch(err) {
        console.error("Internal server endpoint has error with transcription services.")
    }

};