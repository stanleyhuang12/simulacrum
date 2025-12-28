import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
  const { cookies, url, fetch } = event;

  const sessionId = cookies.get('session-id-delibs');
  let avatarCacheStatus = cookies.get('persistent-avatar-cache');

  const uriData = url.searchParams.get('data');
  let form: any = null;

  try {
    form = uriData ? JSON.parse(decodeURIComponent(uriData)) : null;
  } catch {
    cookies.set('persistent-avatar-cache', 'failed', {
      path: '/',
      httpOnly: true,
      maxAge: 60 * 60
    });
    return { status: 400 };
  }

  if (avatarCacheStatus && avatarCacheStatus !== 'failed') {
    return {
      form,
      imageGenerationObject: { data: [{ url: avatarCacheStatus }] },
      sess_cookies: sessionId,
      status: 200
    };
  }

  if (!form) {
    cookies.set('persistent-avatar-cache', 'failed', {
      path: '/',
      httpOnly: true,
      maxAge: 60 * 60
    });
    return { status: 400 };
  }

  // Generate avatar
  const response = await fetch('/api/instantiate-lawmaker-avatar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(form)
  });

  if (!response.ok) {
    cookies.set('persistent-avatar-cache', 'failed', {
      path: '/',
      httpOnly: true,
      maxAge: 60 * 60
    });
    return { status: 500 };
  }

  const imageGenerationObject = await response.json();

  const generatedUrl = imageGenerationObject?.data?.[0]?.url;
  if (generatedUrl) {
    cookies.set('persistent-avatar-cache', generatedUrl, {
      path: '/',
      httpOnly: true,
      maxAge: 60 * 60
    });
  } else {
    cookies.set('persistent-avatar-cache', 'failed', {
      path: '/',
      httpOnly: true,
      maxAge: 60 * 60
    });
  }

  return {
    form,
    imageGenerationObject,
    sess_cookies: sessionId,
    status: 200
  };
};
