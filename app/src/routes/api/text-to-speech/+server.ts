import type { RequestHandler } from './$types';
import { json, error } from "@sveltejs/kit"
import { OPENAI_API_KEY } from "$env/static/private";

export const GET: RequestHandler = async () => {
    return new Response();
};

export const POST: RequestHandler = async( {request} ) => {
    if (!import.meta.env.SSR) {
        return json({error: "This endpoint is only accessible server-side"}, { status: 400 })
    }

    const agentText = await request.text()
    if (!agentText) return json({error: "Agent message is null. Unable to convert to speech "}, {status: 404})

    try {
        const agentAudio = await fetch("https://api.openai.com/v1/audio/speech", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENAI_API_KEY}`,
                "Content-Type": "application/json",
            }, 
            body: JSON.stringify({
                model: "gpt-4o-mini-tts",
                input: agentText, 
                voice: "alloy", 
                instructions: "Speak in an appropriate and professional manner.",
                response_format: "wav"
            })
        });

        if (!agentAudio.ok) {
            throw new Error(`TTS API error: ${agentAudio.status} ${agentAudio.statusText}`); };
        
            
        const agentAudioArray = await agentAudio.arrayBuffer();      
        return new Response(agentAudioArray, {
            status: 200, 
            headers: {
                "Content-Type": "audio/wav"
            }
        });
        } catch(err) {
            return error(400, `Error ${err}`)
        
    }
}

// export const POST: RequestHandler = async ( {request} ) => {
//     // Checks if component is in SSR code.
//     if (!import.meta.env.SSR) {
//         return json({ error: "This endpoint is only accessible server-side" }, { status: 400 });
//     } 
//     // Try to pass a curl request and stream the audio back to client. 
//     try {
//         const requestBody = await request.text()
//         // fetch API 
//         const response = await fetch("https://api.openai.com/v1/audio/speech", {
//             method: "POST",
//             headers: { 
//                 "Authorization": `Bearer ${OPENAI_API_KEY}`, 
//                 "Content-Type": "application/json"
//             },
//             body: JSON.stringify({ 
//                 "input": requestBody,
//                 "model": "gpt-4o-mini-tts",
//                 "response_format": "wav",
//                 "voice": "alloy",
//                 "stream_format": "sse",
//             })
//         });
//         // if API doesn't return a response then do something 
//         if (!response.ok) {
//             const errorText = await response.text()
//             throw Error(`OpenAI TTS Error: ${errorText}`)
//         };
    
//         // bundle the streamed audio in and return back to client 

//         // return if the transcript is completed 
//         return new Response(response.body, { 
//             headers: { 
//                 "Content-Type": "text/event-stream",
//                 "Cache-Control": "no-cache",
//                 "Connection": "keep-alive"
//             }

//         });

//         // """ Example of a streamed audio; we have to 
//         //     {
//         //     "type": "speech.audio.delta",
//         //     "audio": "base64-encoded-audio-data"
//         //     }
//         // """

//     } catch(err) {
//         console.error(err);
//         throw error(500, "TTS request failed.")
//     }

// }


// // export const POST: RequestHandler = async ( {request} ) => {
// //     console.log(request)
// //     const agentText = await request.text();
    
// //     console.log(agentText)
// //     const agentResponse = await fetch("https://api.openai.com/v1/audio/speech", 
// //         {
// //             method: "POST",
// //             headers: {
// //                 "Authorization": `Bearer ${import.meta.env.OPENAI_API_KEY}`,
// //                 "Content-Type": "application/json"
// //             },
// //             body: JSON.stringify({
// //                 model: "gpt-4o-mini-tts",
// //                 input: agentText, 
// //                 voice: "alloy",
// //                 instructions: "Speak in an appropriate manner as an eager but professional lawmaker.",
// //                 response_format: "wav",
// //                 stream: true
// //             })
// //         }
// //     );

// //     return json({"success": "true"});
// // };