// src/routes/interface/+page.server.ts
import { redirect } from '@sveltejs/kit';
import { validateAndRetrieveDeliberation } from '$db/+server';
import type { PageServerLoad } from "./$types";


export const load: PageServerLoad = async( event )=>{
    const sess_cookies = event.cookies.get('session-id-delibs');
    const lawmakerAvatarCache = event.cookies.get('persistent-avatar-cache'); 
    console.log(sess_cookies); 

    if (event.url.searchParams.get('demo') === "true") {
        return { 
            demo: true, 
            sess_cookies: sess_cookies || "is_demo", 
            lawmakerAvatarURL: lawmakerAvatarCache, 
        }
        
    } else {
        const deliberationObject = await validateAndRetrieveDeliberation(sess_cookies) 
        if (deliberationObject == null) { throw redirect(303, '/form')}; 
        return {
            form: {
                username: deliberationObject.dataValues.username,
                organization: deliberationObject.dataValues.organization,
                state: deliberationObject.dataValues.state,
                lawmakerName: deliberationObject.dataValues.lawmaker_name, 
                meetingTopic: `15 minute meeting with ${deliberationObject.dataValues.lawmaker_name} regarding ${deliberationObject.dataValues.policy_topic}`
            },
            sess_cookies: sess_cookies, 
            lawmakerAvatarURL: lawmakerAvatarCache
        }; 
    }   
 




    // Need transport hooks if we are going to load arbitrary non-POJOS data
}