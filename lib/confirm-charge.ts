// Client-side confirm-charge handshake with the Mythos dashboard parent frame.
// Adapted from mythos-sdk/docs/examples/mythos-client.ts — this app already has
// its own session/report-usage routes (verify-session.ts, calculate.ts), so only
// the postMessage confirm dance is lifted, not the whole reference client.

interface ConfirmChargeResponseMessage {
  type: 'mythos:confirm-charge-response';
  requestId: string;
  approved: boolean;
}

const DEFAULT_CONFIRM_TIMEOUT_MS = 10_000;

// Resolves false (never rejects) on timeout, decline, or if not embedded — fail-closed.
export function confirmCharge(
  credits: number,
  reason?: string,
  timeoutMs: number = DEFAULT_CONFIRM_TIMEOUT_MS,
): Promise<boolean> {
  return new Promise((resolve) => {
    if (window === window.parent) {
      resolve(false);
      return;
    }

    const requestId =
      typeof window.crypto?.randomUUID === 'function'
        ? window.crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    let settled = false;

    const timer = window.setTimeout(() => {
      if (settled) return;
      window.parent.postMessage({ type: 'mythos:confirm-charge-timeout', requestId }, '*');
      cleanup();
      resolve(false);
    }, timeoutMs);

    function onMessage(event: MessageEvent) {
      if (event.source !== window.parent) return;
      const data = event.data as Partial<ConfirmChargeResponseMessage> | null;
      if (!data || data.type !== 'mythos:confirm-charge-response') return;
      if (typeof data.requestId !== 'string' || data.requestId !== requestId) return;
      cleanup();
      resolve(Boolean(data.approved));
    }

    function cleanup() {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      window.removeEventListener('message', onMessage);
    }

    window.addEventListener('message', onMessage);
    window.parent.postMessage({ type: 'mythos:confirm-charge', requestId, credits, reason }, '*');
  });
}
