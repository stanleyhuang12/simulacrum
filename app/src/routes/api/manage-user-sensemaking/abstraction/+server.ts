import type { RequestHandler } from "@sveltejs/kit";
import { validateAndRetrieveDeliberation, updateDeliberationSensemaking } from "$db/+server";
import { hydrateDeliberationInstance } from "$models/+deliberations";
import { error, json } from "@sveltejs/kit";

export const GET: RequestHandler = async(event) => {
    try {
        const sessionId = event.cookies.get('session-id-delibs');
        const dRecord = await validateAndRetrieveDeliberation(sessionId);
        if (!dRecord) { return error(404, "Deliberation object not found. ")};
        const d = hydrateDeliberationInstance(dRecord)

        return json({
            data: d.userSenseMaking.abstraction, 
            success: true,
        })
        
    } catch(err){
        return error(500, `Could not retrieve the abstractions. Error: ${err}`)
      }
}

export const POST: RequestHandler = async( event ) => {
    /*
     * If user makes a request for AI-assisted support, we will request feedback, update the database, and return the AI assisted feedback 
     */
    
    try {
      const sessionId = event.cookies.get('session-id-delibs');
      const dRecord = await validateAndRetrieveDeliberation(sessionId);
      if (!dRecord) { return error(404, "Deliberation object not found. ")}; 

      const d = hydrateDeliberationInstance(dRecord); 

      
      const res = await event.request.json(); 

      const episodeNumber: number = res.episodeNumber; 
      const userAbstraction: string = res.userAbstraction; 
      const coachAbstraction: string = res.coachAbstraction; 
    
      if (coachAbstraction ) {
        d.logAbstractConceptualization(episodeNumber, userAbstraction, coachAbstraction )
      } else {
        d.logAbstractConceptualization(episodeNumber, userAbstraction)
      }

      updateDeliberationSensemaking(dRecord, d); 
      
      return json({
        data: coachAbstraction 
      }); 
      
    } catch(err){
      return error(500, "Could not submit an update the database")
    }
    
  
  
  }