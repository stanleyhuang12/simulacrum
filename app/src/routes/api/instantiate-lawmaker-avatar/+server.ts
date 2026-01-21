import { HUIT_OPENAI_API_KEY, OPENAI_API_KEY } from '$env/static/private';
import type { RequestHandler } from '@sveltejs/kit';
import { json, error } from '@sveltejs/kit';


export const POST: RequestHandler = async ({ request }) => {
  try {
    console.log("Fetching lawmaker avatar API generation")
    const form = await request.json();
    let body: { [key:string]:any } = { 
        prompt: `Generate a single, semi-photo-realistic avatar of a lawmaker who is ${form.lawmakerGender}, ${form.lawmakerEthnicity}, ${form.lawmakerAge}. Be careful to not replicate harmful stereotypes.`,
        model: "dall-e-3",
        size: "1024x1024",
    }
    if (body.model == "dall-e-3") {
        let key = "style";
        body[key] = "natural";
    };

    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify(body)
    });

    const res = await response.json();
    console.log(res)

    if (!response.ok) { 
        console.error(`Error calling OpenAI's Image Generation API: ${JSON.stringify(res)}`);
        return error(500, `Image Generation API call failed. See: ${JSON.stringify(res)}`)
    }
    return json(res);
  } catch (err) {
    console.error("Error calling OpenAI's Image Generation API from endpoint:", err);
    return error(500, `Image Generation API call failed: ${err}`)
  }
};