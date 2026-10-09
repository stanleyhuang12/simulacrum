import { redirect } from '@sveltejs/kit';
import { validateAndRetrieveDeliberation } from '$db/+server';
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async (event) => {
    const sessionId = event.cookies.get('session-id-delibs');
    if (!sessionId) redirect(303, '/form');

    const record = await validateAndRetrieveDeliberation(sessionId);
    if (record == null) redirect(303, '/form');

    if (record.getDataValue('guardrail_tripwire')) redirect(303, '/forbidden');

    const cached = event.cookies.get('persistent-avatar-cache') ?? '';
    const [cachedSession, ...urlParts] = cached.split('|');
    const cachedUrl = urlParts.join('|');
    const lawmakerAvatarURL =
        cachedSession === sessionId && cachedUrl && cachedUrl !== 'failed' ? cachedUrl : null;

    return {
        sessionId,
        lawmakerAvatarURL,
        advocate: {
            username: record.getDataValue('username'),
            organization: record.getDataValue('organization')
        },
        lawmaker: {
            name: record.getDataValue('lawmaker_name'),
            state: record.getDataValue('state'),
            ideology: record.getDataValue('ideology')
        },
        policyTopic: record.getDataValue('policy_topic'),
        conversationTurn: record.getDataValue('conversation_turn') ?? 0
    };
};
