import { error, json  } from "@sveltejs/kit";


export async function GET( {request} ) {
    // The request's body is text
    // Returns if not SSR code 
    if (!import.meta.env.SSR) {
        return  json({ error: "This endpoint is only accessible server-side" }, { status: 400 });
    } 

    // Try-Pass a curl request and stream the audio back to client 
    try {
        // get text 
        const requestBody = await request.text()
        // fetch API 
        const response = await fetch("https://api.openai.com/v1/audio/speech", {
            method: "POST",
            headers: { 
                "Authorization": `Bearer ${import.meta.env.OPENAI_API_KEY}`, 
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ 
                "input": requestBody,
                "model": "gpt-4o-mini-tts",
                "response_format": "wav",
                "voice": "alloy",
                "stream_format": "sse",
            })
        });
        // if API doesn't return a response then do something 
        if (!response.ok) {
            const errorText = await response.text()
            throw Error(`OpenAI TTS Error: ${errorText}`)
        };

        // bundle the streamed audio in and return back to client 
        const obj = await response.json()
        
        // return if the transcript is completed 
        if (obj.type === "speech.audio.done") return 
    
        return json(obj)

        // """ Example of a streamed audio; we have to 
        //     {
        //     "type": "speech.audio.delta",
        //     "audio": "base64-encoded-audio-data"
        //     }
        // """

    } catch(err) {
        console.error(err);
        throw error(500, "TTS request failed")
    }

}