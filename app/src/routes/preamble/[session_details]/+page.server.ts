import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

const AVATAR_COOKIE = 'persistent-avatar-cache';

export const load: PageServerLoad = async (event) => {
  const { cookies, url, fetch } = event;

  const sessionId = cookies.get('session-id-delibs');
  if (!sessionId) redirect(303, '/form');

  const uriData = url.searchParams.get('data');
  if (!uriData) redirect(303, '/form');

  let form: Record<string, string>;
  try {
    form = JSON.parse(decodeURIComponent(uriData));
  } catch {
    redirect(303, '/form');
  }

  /* The cache is scoped to the session so a second run in the same browser
     does not inherit the previous lawmaker's face. */
  const cached = cookies.get(AVATAR_COOKIE);
  const [cachedSession, ...cachedUrlParts] = (cached ?? '').split('|');
  const cachedUrl = cachedUrlParts.join('|');

  if (cachedSession === sessionId && cachedUrl && cachedUrl !== 'failed') {
    return { form, avatarUrl: cachedUrl, sessionId, avatarFailed: false };
  }

  const rememberAvatar = (value: string) =>
    cookies.set(AVATAR_COOKIE, `${sessionId}|${value}`, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60
    });

  let avatarUrl: string | null = null;

  try {
    const response = await fetch('/api/instantiate-lawmaker-avatar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });

    if (response.ok) {
      const imageGenerationObject = await response.json();
      avatarUrl = imageGenerationObject?.data?.[0]?.url ?? null;
    } else {
      console.error('Avatar generation failed:', response.status, await response.text());
    }
  } catch (err) {
    console.error('Avatar generation threw:', err);
  }

  rememberAvatar(avatarUrl ?? 'failed');

  return { form, avatarUrl, sessionId, avatarFailed: avatarUrl === null };
};
