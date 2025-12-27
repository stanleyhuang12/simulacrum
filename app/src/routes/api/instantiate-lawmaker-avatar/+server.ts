import { HUIT_OPENAI_API_KEY } from '$env/static/private';
import type { RequestHandler } from '@sveltejs/kit';
import { json, error } from '@sveltejs/kit';


export const POST: RequestHandler = async ({ request }) => {
    console.log(HUIT_OPENAI_API_KEY); 
  try {
    console.log("Fetching lawmaker avatar API generation")
    const form = await request.json();
    console.log(form)
    const body = { 
        prompt: `Generate a semi-photo-realistic avatar of a lawmaker who is ${form.lawmakerGender}, ${form.lawmakerEthnicity}, ${form.lawmakerAge}. Be careful to not to create stereotypical images or replicate harmful societal biases.`,
        model: "dall-e-2",
        background: "transparent",
        size: "256x256",
        quality: "medium",
    }
    const response = await fetch("https://go.apis.huit.harvard.edu/ais-openai-direct/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": HUIT_OPENAI_API_KEY
      },
      body: JSON.stringify(body)
    });

    const res = await response.json();
    console.log(res)
    return json(res);
  } catch (err) {
    console.error("Error calling OpenAI's Image Generation API:", err);
    return error(500, `Image Generation API call failed: ${err}`)
  }
};