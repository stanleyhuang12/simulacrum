import type { Actions, PageServerLoad } from "./$types";
import { redirect } from "@sveltejs/kit";


export const load: PageServerLoad = async ( { cookies } ) => {
    const userID = cookies.set("session-id-delibs", crypto.randomUUID(), {path: "/", maxAge: 7200})
    return userID 
}

export const actions: Actions = {
    submit: async (event) => {
        const sess_cookies = await event.cookies.get("session-id-delibs")
        const formData = await event.request.formData();
        const payload = Object.fromEntries(formData); // Convert FormData -> object
        console.log(sess_cookies)
        console.log(payload)

        const res = await fetch("/create_deliberations_instance", {
            method: "POST",
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Cookie': `session-id-delibs=${sess_cookies}`
            },
            body: JSON.stringify(payload),
            credentials: "include"
        });

        if (!res.ok) {
            const err = await res.json();
            console.error("Server rejected payload:", err);
            return { success: false, error: err };
        } else { 
            const dataString = encodeURIComponent(JSON.stringify(payload));
            console.log(dataString)
            redirect(303, `/preamble/session_id_delibs=${sess_cookies}?data=${dataString}`)
        }
    }
} satisfies Actions;
