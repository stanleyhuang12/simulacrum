import { OPENAI_API_KEY } from '$env/static/private';
import type { RequestHandler } from '@sveltejs/kit';
import { json, error } from '@sveltejs/kit';

export const GET: RequestHandler = async () => {
    return new Response("This is a vanilla text/chat completions API call.");
}; 


export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();

    const agentResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify(body)
    });

    const res = await agentResponse.json();

    return json(res);

  } catch (err) {
    console.error("Error calling OpenAI API:", err);
    return json({ error: "Failed to call OpenAI API" }, { status: 500 });
  }
};