/**
 * Cross-Tab Real-Time Event Bus using BroadcastChannel.
 * Enables instant multi-tab communication (e.g. SOS alerts triggered in Tab 1
 * immediately fire in Tab 2 and Tab 3).
 */

const CHANNEL_NAME = 'elderguard-realtime-channel';
let channel = null;
let isDispatchingLocally = false;

if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = (event) => {
      if (!event.data || !event.data.type) return;
      const { type, payload } = event.data;
      
      // Re-emit as a local window CustomEvent with broadcast origin flag
      window.dispatchEvent(new CustomEvent(type, { 
        detail: { ...payload, _fromBroadcastChannel: true } 
      }));
    };
  } catch (e) {
    console.warn('BroadcastChannel initialization warning:', e);
  }
}

export function broadcastRealtimeEvent(type, payload) {
  if (isDispatchingLocally) return;

  isDispatchingLocally = true;
  try {
    window.dispatchEvent(new CustomEvent(type, { detail: payload }));
  } catch (e) {
    console.warn('Local CustomEvent dispatch error:', e);
  } finally {
    isDispatchingLocally = false;
  }

  if (channel && !payload?._fromBroadcastChannel) {
    try {
      channel.postMessage({ type, payload: { ...payload, _fromBroadcastChannel: true } });
    } catch (e) {
      console.warn('Failed to broadcast event to other tabs:', e);
    }
  }
}

export default broadcastRealtimeEvent;
