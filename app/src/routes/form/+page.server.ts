import type { Actions, PageServerLoad } from "./$types";
import { redirect } from "@sveltejs/kit";
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ( event ) => {
    const userID = event.cookies.set("session-id-delibs", crypto.randomUUID(), {path: "/", maxAge: 7200})
    return userID
}

function validateEmail(email:  string): boolean {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email.toLowerCase());
}

export const actions: Actions = {
    
    submit: async (event) => {
        const sess_cookies = await event.cookies.get("session-id-delibs")
        const formData = await event.request.formData();
        
        const payload = Object.fromEntries(formData); // Convert FormData -> object
        const isDemo = payload.demo === "true"; 
        delete payload.demo; 
        const payloadStr = JSON.stringify(payload); 
        
        console.log(payload)
        const email = payload.email.toString(); 
        let is_missing = []; 

        for (const [k, v] of Object.entries(payload)) {
            if (v.toString().length < 1) {
                is_missing.push(k)
            }
        }; 
        console.log("is_missing", is_missing)
        if (is_missing.length > 0) {
            if (!validateEmail(email)) {
                return fail(400, {"is_invalid": ["email"], ...( is_missing.length && { is_missing })})}
            else {
                return fail(400, {"is_missing": is_missing})
            }
        };  

        if (isDemo) {
            const dataString = encodeURIComponent(payloadStr); 
            console.log('Redirecting the user')
            redirect(303,  `/preamble/session_id_delibs=${sess_cookies}?data=${dataString}&demo=true`)
        }

        const res = await event.fetch("/api/create-deliberation-instance", {
            method: "POST",
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Cookie': `session-id-delibs=${sess_cookies}`
            },
            body: payloadStr,
            credentials: "include"
        });

        if (!res.ok) {
            const err = await res.json();
            console.error("Server rejected payload:", err);
            return fail(400, `Server rejected the payload: ${err}`);
        } else { 
            const dataString = encodeURIComponent(payloadStr);
            console.log(dataString)
            redirect(303, `/preamble/session_id_delibs=${sess_cookies}?data=${dataString}`)
        }
    }
} satisfies Actions;
