export async function fetchWithAuthRetry(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const requestInit: RequestInit = {
    credentials: 'same-origin',
    ...init,
  };

  const firstResponse = await fetch(input, requestInit);

  if (firstResponse.status !== 401) {
    return firstResponse;
  }

  const refreshResponse = await fetch('/api/auth/refresh', {
    method: 'POST',
    credentials: 'same-origin',
  });

  if (!refreshResponse.ok) {
    return firstResponse;
  }

  return fetch(input, requestInit);
}