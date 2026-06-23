/**
 * Web version of offline review queue.
 * Uses localStorage to queue reviews written without connectivity.
 * Auto-syncs when the app detects a user is authenticated (called from App.tsx).
 */

const QUEUE_KEY = 'offline_review_queue';

type QueuedReview = {
  property_id: string;
  rating: number;
  text: string;
  tenancy_period?: { from?: string; to?: string };
};

export async function queueReview(review: QueuedReview) {
  const raw = localStorage.getItem(QUEUE_KEY);
  const queue: QueuedReview[] = raw ? JSON.parse(raw) : [];
  queue.push(review);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function syncOfflineReviews() {
  const raw = localStorage.getItem(QUEUE_KEY);
  if (!raw) return;
  const queue: QueuedReview[] = JSON.parse(raw);
  if (!queue.length) return;

  if (!navigator.onLine) return;

  // Dynamic import to avoid circular dependency
  const { api } = await import('./api');

  const remaining: QueuedReview[] = [];
  for (const review of queue) {
    try {
      await api.post('/reviews', review);
    } catch (err: any) {
      if (err?.response?.status !== 409) remaining.push(review);
    }
  }
  localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
}