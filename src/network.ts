// AbortSignal.timeout is unavailable in some otherwise supported Android WebViews.
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout = 20000,
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, {
      ...options,
      signal: options.signal || controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}
