import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { DeliberationORM } from "$db/+server";
import { Deliberation } from "$models/+deliberations";

export const POST: RequestHandler = async ({ cookies, request }) => {
    const userID = cookies.get('session-id-delibs');
    if (!userID) return error(401, "Missing session-id-delibs cookie.");

    const res = await request.json();

    const d = new Deliberation(
        res.username,
        res.organization,
        "deliberations",
        res.policy_topic,
        res.state,
        1,
        res.ideology,
        res.lawmaker_name,
        new Date(),
        new Date(),
    );

    try {
        /* Upsert rather than create: the session id is reused across form
           re-submissions, so a plain insert would hit the primary key. */
        await DeliberationORM.upsert({
            username: d._username,
            unique_id: userID,
            organization: d._group,
            state: d.state,
            policy_topic: d.policy_topic,
            ideology: d.ideology,
            lawmaker_name: d.lawmaker_name,
            degree_of_support: d.lawmaker.degree_of_support,
            persona: d.lawmaker.persona,
            memory: [],
            sensemaking: {},
            conversation_turn: 0,
            guardrail_tripwire: false,
            guardrail_reason: null,
            guardrail_timestamp: null,
        });
    } catch (err: any) {
        console.error("Failed to create deliberation in PostgreSQL:", err);
        return error(500, `Deliberation not created in PostgreSQL: ${err}`);
    }

    console.log('Deliberation event created in PostgreSQL for session', userID);
    return json({ userID }, { status: 201 });
};
