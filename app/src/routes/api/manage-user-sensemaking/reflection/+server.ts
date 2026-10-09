import type { RequestHandler } from '@sveltejs/kit';
import { json, error } from '@sveltejs/kit';
import { updateDeliberationSensemaking, validateAndRetrieveDeliberation } from '$db/+server';
import { hydrateDeliberationInstance } from '$models/+deliberations';

export const GET: RequestHandler = async (event) => {
  /* Retrieves the reflection saved on the server. */
  const sessionId = event.cookies.get('session-id-delibs');
  const dRecord = await validateAndRetrieveDeliberation(sessionId);
  if (!dRecord) return error(404, "Deliberation object not found.");

  const d = hydrateDeliberationInstance(dRecord.toJSON());
  return json(d.userSensemaking);
};

export const POST: RequestHandler = async (event) => {
  /* Stores the advocate's spoken reflection against their deliberation. */
  try {
    const sessionId = event.cookies.get('session-id-delibs');
    const dRecord = await validateAndRetrieveDeliberation(sessionId);
    if (!dRecord) return error(404, "Deliberation object not found.");

    const d = hydrateDeliberationInstance(dRecord.toJSON());

    const userReflection = await event.request.text();
    d.logUserReflection(userReflection);

    await updateDeliberationSensemaking(dRecord, d);

    return json({
      data: d.userSensemaking,
      error: null,
      meta: { loggedAt: new Date().toISOString() }
    });
  } catch (err) {
    console.error("Manage user sensemaking endpoint failed:", err);
    return error(500, `Manage user sensemaking endpoint failed. ${err}`);
  }
};
