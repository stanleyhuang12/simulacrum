import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { validateAndRetrieveDeliberation, updateDeliberationRecord } from '$db/+server';
import { hydrateDeliberationInstance } from '$models/+deliberations';

export const POST: RequestHandler = async (event) => {
    const sessionId = event.cookies.get('session-id-delibs');
    if (!sessionId) return error(401, 'Missing session-id-delibs');

    const res = await event.request.json();
    const input: string = res.text;

    if (!input || !input.trim()) {
        return error(400, 'No transcribed text supplied.');
    }

    /* These arrive as ISO strings over JSON; the timing maths needs real Dates. */
    const now = new Date();
    const responseAwaitTime = res.responseAwaitTime ? new Date(res.responseAwaitTime) : now;
    const responseStartTime = res.responseStartTime ? new Date(res.responseStartTime) : now;
    const responseEndTime = res.responseEndTime ? new Date(res.responseEndTime) : now;

    try {
        const delibsRecord = await validateAndRetrieveDeliberation(sessionId);
        if (delibsRecord == null) {
            return error(404, 'No deliberation session found.');
        }

        if (delibsRecord.getDataValue('guardrail_tripwire')) {
            return json(
                { type: 'guardrail.triggered', reason: delibsRecord.getDataValue('guardrail_reason') },
                { status: 403 }
            );
        }

        const d = hydrateDeliberationInstance(delibsRecord.toJSON());

        /* Turns 0-2 are scripted openers, so moderation starts at turn 3 and then
           runs every third turn over a sliding window of the user's own words. */
        const turn = d.conversation_turn;
        if (turn >= 3 && turn % 3 === 0) {
            const guardrailResponse = await d._guardrail_moderation(input, event.fetch);
            if (guardrailResponse.triggered) {
                await updateDeliberationRecord(delibsRecord, d, d.lawmaker._retrieve_deserialized_memory());
                return json(
                    { type: 'guardrail.triggered', reason: guardrailResponse.reason },
                    { status: 403 }
                );
            }
        }

        const response = await d.panel_discussion(
            input,
            event.fetch,
            responseAwaitTime,
            responseStartTime,
            responseEndTime
        );

        if (typeof response !== 'string') {
            console.error('Lawmaker response was not text:', response);
            return error(502, 'The lawmaker could not respond. Please try again.');
        }

        await updateDeliberationRecord(
            delibsRecord,
            d,
            d.lawmaker._retrieve_deserialized_memory()
        );

        return json(
            {
                type: 'automated.response',
                response,
                episodeNumber: d.conversation_turn,
                winddown: d.shouldWindDown()
            },
            { status: 200 }
        );
    } catch (err) {
        console.error('manage-deliberation-instance failed:', err);
        return error(500, `${err}`);
    }
};
