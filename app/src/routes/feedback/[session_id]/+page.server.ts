import type { PageServerLoad } from "./$types";
import { redirect } from "@sveltejs/kit";
import { validateAndRetrieveDeliberation } from "$db/+server";

export const load: PageServerLoad = async ({ cookies }) => {
    const sessionId = cookies.get('session-id-delibs');
    if (!sessionId) redirect(303, "/form");

    const record = await validateAndRetrieveDeliberation(sessionId);
    if (record == null) redirect(303, "/form");

    return { sessionId };
};
