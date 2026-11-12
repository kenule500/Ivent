import {
  readQueuedCheckIns,
  removeQueuedCheckIns,
  type QueuedCheckIn,
} from "./db";

/**
 * Offline queue replay (BP-005).
 *
 * The server is the source of truth. Each queued scan is sent with its original
 * capture time, and only accepted outcomes leave the device queue. Conflict and
 * not-found outcomes stay queued so a door operator can resolve them, while a
 * retryable network failure leaves the whole batch untouched.
 */

export type OfflineSyncOutcome =
  | "synced"
  | "already_checked_in"
  | "not_found"
  | "wrong_event"
  | "cancelled";

export interface OfflineSyncResult {
  qrCode: string;
  outcome: OfflineSyncOutcome;
  registrationId?: string;
}

export interface OfflineSyncResponse {
  results: OfflineSyncResult[];
}

export interface QueueSyncSummary {
  synced: number;
  failed: number;
  results: OfflineSyncResult[];
}

const ACCEPTED: ReadonlySet<OfflineSyncOutcome> = new Set([
  "synced",
  "already_checked_in",
]);

const MAX_BATCH = 100;

export async function syncDoorQueue(
  eventId: string,
  send: (items: Array<{ qrCode: string; scannedAt: number }>) => Promise<OfflineSyncResponse>
): Promise<QueueSyncSummary> {
  const queue = await readQueuedCheckIns(eventId);
  if (queue.length === 0) {
    return { synced: 0, failed: 0, results: [] };
  }

  const results: OfflineSyncResult[] = [];
  let synced = 0;

  for (let index = 0; index < queue.length; index += MAX_BATCH) {
    const batch = queue.slice(index, index + MAX_BATCH);
    const response = await send(
      batch.map((item: QueuedCheckIn) => ({
        qrCode: item.qrCode,
        scannedAt: item.scannedAt,
      }))
    );

    const accepted = new Set(
      response.results
        .filter((result) => ACCEPTED.has(result.outcome))
        .map((result) => result.qrCode)
    );

    await removeQueuedCheckIns(
      batch.filter((item) => accepted.has(item.qrCode)).map((item) => item.id)
    );

    synced += accepted.size;
    results.push(...response.results);
  }

  return {
    synced,
    failed: Math.max(queue.length - synced, 0),
    results,
  };
}
