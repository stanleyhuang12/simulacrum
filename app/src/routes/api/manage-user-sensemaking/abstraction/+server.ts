import type { RequestHandler } from "@sveltejs/kit";
import { validateAndRetrieveDeliberation, updateDeliberationSensemaking } from "$db/+server";
import { hydrateDeliberationInstance } from "$models/+deliberations";
import { error, json } from "@sveltejs/kit";

export const GET: RequestHandler = async (event) => {
    try {
        const sessionId = event.cookies.get('session-id-delibs');
        const dRecord = await validateAndRetrieveDeliberation(sessionId);
        if (!dRecord) return error(404, "Deliberation object not found.");

        const d = hydrateDeliberationInstance(dRecord.toJSON());

        return json({
            data: d.userSensemaking.abstraction ?? null,
            success: true
        });
    } catch (err) {
        return error(500, `Could not retrieve the abstractions. Error: ${err}`);
    }
};

export const POST: RequestHandler = async (event) => {
    /* Stores what the advocate took away from the session. */
    try {
        const sessionId = event.cookies.get('session-id-delibs');
        const dRecord = await validateAndRetrieveDeliberation(sessionId);
        if (!dRecord) return error(404, "Deliberation object not found.");

        const d = hydrateDeliberationInstance(dRecord.toJSON());

        const res = await event.request.json();
        const userAbstraction: string = res.userAbstraction;

        if (!userAbstraction) return error(400, "No abstraction supplied.");

        d.logUserAbstraction(userAbstraction);
        await updateDeliberationSensemaking(dRecord, d);

        return json({ data: d.userSensemaking.abstraction });
    } catch (err) {
        console.error("Could not update abstraction:", err);
        return error(500, "Could not submit an update to the database.");
    }
};
