import { OPENAI_API_KEY } from "$env/static/private";
import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';


export const POST: RequestHandler = async() => {
    try {
        const ephemeralKey = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENAI_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "session": {
                    "type": "transcription",
                    "audio": {
                        "input": {
                            "transcription": {
                                "language": "en",
                                "model": "gpt-4o-mini-transcribe",
                                "prompt": "The following is a conversation between a community advocate with a policymaker and their staff."
                            },
                            "turn_detection": {
                                "type": "server_vad"
                            }
                        }
                    }
                }
            })
        })
        return json({ephemeralKey: ephemeralKey})

    } catch(err) {
        console.error(`Error: ${err}`);
        return error(400, err && typeof err === "object" && "message" in err ? (err as Error).message : String(err || "Error"))
    }
}
