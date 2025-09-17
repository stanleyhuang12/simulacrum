import type { PageServerLoad } from "./$types";

export const load: PageServerLoad =  async ( {params} ) => {
    console.log(params) 
    const cookieStr = params.session_id;
    const match = cookieStr.match(/session_id_delibs=([^;]+)/);
    const sess_cookies = match ? match[1] : null;

    try {
        const feedback = await fetch("http://localhost:5173/trial-v1/delibs/retrieve-end-of-call-transcript-and-feedback", {
            method: "GET",
            headers: {
                'Cookie': `session-id-delibs=${sess_cookies}`

            }
        })

        const feedbackJSON = await feedback.json()
        return {
            feedback: feedbackJSON, 
            status: 200
        }
    } catch(err) {
        console.error(err); 
        return { 
            form: null, 
            sess_cookies: sess_cookies, 
            status: 500,
            error: err 
        }
    }
    //feedback is a JSON object that includes identifier, username, full_transcript, and trainer_agent_feedback

}