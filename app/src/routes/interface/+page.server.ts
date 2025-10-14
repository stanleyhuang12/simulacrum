// src/routes/interface/+page.server.ts
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from "./$types";


export const load: PageServerLoad = async( {cookies} )=>{
    const sess_cookies = cookies.get('session-id-delibs');
    console.log(sess_cookies)
    const isUserValidated = await fetch("http://18.116.42.126/trial-v1/delibs/validate-user", {
        headers: {
            "Cookie": `session-id-delibs=${sess_cookies}`
        }
    })

    console.log(isUserValidated);
    if (sess_cookies == null || !isUserValidated.ok) {
        // No session cookie detected or match with PostgreSQL DB, redirect to login or show error
        throw redirect(303, '/form');
    }
    
    cookies.set('session-id-delibs', sess_cookies, {
        secure: false,
        path: '/'
    })

    return {sess_cookies: sess_cookies}; 
}