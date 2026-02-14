import { HUIT_OPENAI_API_KEY, OPENAI_API_KEY } from '$env/static/private';
import type { RequestHandler } from '@sveltejs/kit';
import { json, error, text } from '@sveltejs/kit';
import { updateDeliberationRecord, updateDeliberationSensemaking, validateAndRetrieveDeliberation } from '$db/+server';

import { hydrateDeliberationInstance } from '$models/+deliberations';


export const GET: RequestHandler = async (event) => {
    /* Retrieves the reflection that is saved on the server */
    const sessionId = event.cookies.get('session-id-delibs');
    const dRecord = await validateAndRetrieveDeliberation(sessionId); 
    const d = hydrateDeliberationInstance(dRecord); 
    return json(d.userSenseMaking)
}; 

export const POST: RequestHandler = async ( event ) => {
  /* Post the reflection to the server */
  try {
    const sessionId = event.cookies.get('session-id-delibs');
    const dRecord = await validateAndRetrieveDeliberation(sessionId);
    if (!dRecord) { return error(404, "Deliberation object not found. ")}
    const d = hydrateDeliberationInstance(dRecord)
  
    const userReflection = await event.request.text(); 
    d.userSenseMaking.reflection = userReflection
    
    if (!dRecord) {
      return json({
        data: null,
        error: { code: 404, message: 'Deliberation not found' },
        meta: null
      }, { status: 404 });
    }
    
    await updateDeliberationSensemaking(dRecord, d)
    
    return json({
      data: d.userSenseMaking,
      error: null,
      meta: { updatedAt: new Date().toISOString() }
    });

  } catch (err) {
    console.error("Error calling OpenAI API:", err);
    return json({ error: "Failed to call OpenAI API" }, { status: 500 });
  }
};