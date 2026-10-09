import { env } from '$env/dynamic/private';
import type { RequestHandler } from '@sveltejs/kit';
import { json, error } from '@sveltejs/kit';

const readableEthnicity: Record<string, string> = {
  'hispanic-latino': 'Hispanic or Latino',
  'white-non-hispanic': 'White, non-Hispanic',
  'black-african-american': 'Black or African American',
  asian: 'Asian',
  'native-american': 'Native American',
  'pacific-islander': 'Pacific Islander'
};

const readableGender: Record<string, string> = {
  female: 'a woman',
  male: 'a man',
  nonbinary: 'a non-binary person'
};

export const POST: RequestHandler = async ({ request }) => {
  const form = await request.json();

  /* The form posts `gender`, `ethnicity` and `age`; describe only what was
     actually provided so an unanswered field never reaches the prompt. */
  const traits = [
    readableGender[form.gender],
    readableEthnicity[form.ethnicity],
    form.age ? `aged ${form.age}` : null
  ].filter(Boolean);

  const description = traits.length
    ? `who is ${traits.join(', ')}`
    : 'in professional attire';

  const body: Record<string, unknown> = {
    prompt:
      `Generate a single, semi-photo-realistic head-and-shoulders portrait of a US lawmaker ${description}. ` +
      `Neutral office background, professional attire, natural lighting, facing the camera. ` +
      `Be careful not to replicate harmful stereotypes, and adhere to the demographic details given above.`,
    model: 'dall-e-3',
    size: '1024x1024',
    style: 'natural'
  };

  try {
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.OPENAI_API_KEY}`
      },
      body: JSON.stringify(body)
    });

    const res = await response.json();

    if (!response.ok) {
      console.error(`Image generation failed: ${JSON.stringify(res)}`);
      return error(502, `Image generation failed: ${JSON.stringify(res)}`);
    }

    return json(res);
  } catch (err) {
    console.error('Image generation threw:', err);
    return error(502, `Image generation failed: ${err}`);
  }
};
