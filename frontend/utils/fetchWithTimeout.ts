// A plain `fetch()` to an address that's technically unreachable (wrong LAN
// IP, phone on a different WiFi than the backend, server not running, etc.)
// doesn't fail fast — the OS keeps retrying the TCP connection under the
// hood, which can take anywhere from ~15s to a couple of minutes before
// React Native's fetch finally rejects with "Network request failed". From
// the screen's point of view that looks exactly like an endless spinner,
// even though the code technically has a loading/error state that *will*
// eventually resolve.
//
// The first version of this wrapper only used AbortController and relied on
// `fetch()` itself rejecting once aborted. That's the textbook approach, but
// on iOS specifically, React Native's networking layer doesn't always
// propagate an abort signal for a request that's still stuck at the
// connection stage (never got as far as a response) — the fetch promise can
// just never settle even after `controller.abort()` is called, which is
// exactly why this could still hang forever on iOS while working fine on
// Android.
//
// Fix: race the fetch against a plain JS timer promise instead of trusting
// abort alone. The timer is ordinary `setTimeout` — it doesn't depend on the
// network stack at all, so it is guaranteed to fire and this function is
// guaranteed to return/throw by the deadline no matter what the underlying
// fetch does. We still call `controller.abort()` too, as a best-effort way
// to actually free up the connection, but the app's responsiveness no longer
// depends on that abort actually working.
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = 10000
): Promise<Response> {
  const controller = new AbortController();

  let timer: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error('TIMEOUT'));
    }, timeoutMs);
  });

  try {
    return await Promise.race([
      fetch(input, { ...init, signal: controller.signal }),
      timeoutPromise,
    ]);
  } catch (err: any) {
    if (err?.message === 'TIMEOUT' || err?.name === 'AbortError') {
      throw new Error('TIMEOUT');
    }
    throw err;
  } finally {
    clearTimeout(timer!);
  }
}
