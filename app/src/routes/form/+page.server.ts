import type { Actions, PageServerLoad } from "./$types";
import { redirect, fail } from "@sveltejs/kit";

const SESSION_COOKIE = "session-id-delibs";

/* Fields the advocate fills in about themselves. */
const advocateFields = ["username", "email", "organization", "policy_topic"];

/* Fields that describe the virtual lawmaker, whether random or pre-specified. */
const lawmakerFields = ["lawmaker_name", "ideology", "state", "ethnicity", "gender", "age"];

export const load: PageServerLoad = async (event) => {
    /* Reuse the session if one is already in flight — re-rendering the form (a
       validation failure, a refresh) must not orphan an existing deliberation. */
    let sessionId = event.cookies.get(SESSION_COOKIE);

    if (!sessionId) {
        sessionId = crypto.randomUUID();
        event.cookies.set(SESSION_COOKIE, sessionId, { path: "/", maxAge: 7200 });
    }

    return { sessionId };
};

function validateEmail(email: string): boolean {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email.toLowerCase());
}

export const actions: Actions = {
    submit: async (event) => {
        let sessionId = event.cookies.get(SESSION_COOKIE);

        if (!sessionId) {
            sessionId = crypto.randomUUID();
            event.cookies.set(SESSION_COOKIE, sessionId, { path: "/", maxAge: 7200 });
        }

        const formData = await event.request.formData();
        const payload = Object.fromEntries(formData) as Record<string, string>;

        const is_missing: string[] = [];
        const is_invalid: string[] = [];

        for (const field of [...advocateFields, ...lawmakerFields]) {
            if (!payload[field] || payload[field].toString().trim().length < 1) {
                is_missing.push(field);
            }
        }

        if (payload.email && !validateEmail(payload.email.toString())) {
            is_invalid.push("email");
        }

        if (is_missing.length > 0 || is_invalid.length > 0) {
            return fail(400, { is_missing, is_invalid, server_error: null });
        }

        /* The avatar prompt needs the demographic fields, which the deliberation
           record does not store, so the payload rides along to the preamble. */
        const payloadStr = JSON.stringify(payload);

        const res = await event.fetch("/api/create-deliberation-instance", {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                Cookie: `${SESSION_COOKIE}=${sessionId}`
            },
            body: payloadStr,
            credentials: "include"
        });

        if (!res.ok) {
            const detail = await res.text();
            console.error("Server rejected payload:", detail);
            return fail(502, {
                is_missing: [],
                is_invalid: [],
                server_error:
                    "We could not start your session. Please try again, or contact the STRIPED team if this keeps happening."
            });
        }

        redirect(303, `/preamble/${sessionId}?data=${encodeURIComponent(payloadStr)}`);
    }
} satisfies Actions;
