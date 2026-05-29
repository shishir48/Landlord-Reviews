import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { api } from './api';

const QUEUE_KEY = 'offline_review_queue';

type QueuedReview = {
  property_id: string;
  rating: number;
  text: string;
  tenancy_period?: { from?: string; to?: string };
};

export async function queueReview(review: QueuedReview) {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  const queue: QueuedReview[] = raw ? JSON.parse(raw) : [];
  queue.push(review);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function syncOfflineReviews() {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  if (!raw) return;
  const queue: QueuedReview[] = JSON.parse(raw);
  if (!queue.length) return;

  const state = await NetInfo.fetch();
  if (!state.isConnected) return;

  const remaining: QueuedReview[] = [];
  for (const review of queue) {
    try {
      await api.post('/reviews', review);
    } catch (err: any) {
      if (err?.response?.status !== 409) remaining.push(review);
      // 409 = already submitted, drop it
    }
  }
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
}
