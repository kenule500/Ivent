/**
 * IndexedDB cache for door mode (BP-005).
 *
 * Exactly one event is kept on the device at a time, and only after the
 * organizer explicitly opts in. Check-ins made offline are queued with their
 * original scan time and removed only after the server accepts them. Snapshots
 * are purged 24 hours after the event ends, and queued scans are purged 24
 * hours after capture.
 */

export interface CachedAttendee {
  _id: string;
  attendeeName: string;
  attendeeEmail: string;
  qrCode: string;
  checkedIn: boolean;
  checkedInAt?: number;
}

export interface CachedDoorSnapshot {
  eventId: string;
  event: {
    _id: string;
    title: string;
    slug: string;
    startDate: number;
    endDate: number;
    timezone: string;
    currency: string;
    locale: "en" | "fr";
    doorModeEnabled: boolean;
    locationType: "physical" | "online";
    venue?: string;
    city?: string;
    state?: string;
    country?: string;
  };
  counts: {
    confirmed: number;
    checkedIn: number;
    pending: number;
  };
  attendees: CachedAttendee[];
  cachedAt: number;
}

export interface QueuedCheckIn {
  id: string;
  eventId: string;
  qrCode: string;
  attendeeName: string;
  scannedAt: number;
}

interface DoorMeta {
  key: "active";
  eventId: string;
  optedInAt: number;
}

const DB_NAME = "ivent-door";
const DB_VERSION = 2;
const SNAPSHOT_STORE = "snapshots";
const QUEUE_STORE = "queue";
const META_STORE = "meta";
const RETENTION_MS = 24 * 60 * 60 * 1000;

function available() {
  return typeof window !== "undefined" && "indexedDB" in window;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(SNAPSHOT_STORE)) {
        db.createObjectStore(SNAPSHOT_STORE, { keyPath: "eventId" });
      }
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        const store = db.createObjectStore(QUEUE_STORE, { keyPath: "id" });
        store.createIndex("by_event", "eventId", { unique: false });
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: "key" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readMeta(db: IDBDatabase): Promise<DoorMeta | null> {
  const transaction = db.transaction(META_STORE, "readonly");
  const result = await requestResult(
    transaction.objectStore(META_STORE).get("active")
  );
  return (result as DoorMeta | undefined) ?? null;
}

/** Explicit opt-in. Replacing a different event clears that event's data first. */
export async function enableDoorOffline(eventId: string) {
  if (!available()) throw new Error("Offline storage is not available.");

  const db = await openDatabase();
  try {
    const meta = await readMeta(db);
    if (meta && meta.eventId !== eventId) {
      await clearDoorData(meta.eventId);
    }

    const transaction = db.transaction(META_STORE, "readwrite");
    const record: DoorMeta = { key: "active", eventId, optedInAt: Date.now() };
    await requestResult(transaction.objectStore(META_STORE).put(record));
  } finally {
    db.close();
  }
}

export async function isDoorOfflineEnabled(eventId: string) {
  if (!available()) return false;
  const db = await openDatabase();
  try {
    const meta = await readMeta(db);
    return meta?.eventId === eventId;
  } finally {
    db.close();
  }
}

export async function cacheDoorSnapshot(snapshot: CachedDoorSnapshot) {
  if (!available()) return;

  const db = await openDatabase();
  try {
    const meta = await readMeta(db);
    if (meta?.eventId !== snapshot.eventId) return;

    const transaction = db.transaction(SNAPSHOT_STORE, "readwrite");
    const store = transaction.objectStore(SNAPSHOT_STORE);
    await requestResult(store.clear());
    await requestResult(store.put(snapshot));
  } finally {
    db.close();
  }
}

export async function readDoorSnapshot(eventId: string) {
  if (!available()) return null;

  const db = await openDatabase();
  try {
    const transaction = db.transaction(SNAPSHOT_STORE, "readonly");
    const result = await requestResult(
      transaction.objectStore(SNAPSHOT_STORE).get(eventId)
    );
    return (result as CachedDoorSnapshot | undefined) ?? null;
  } finally {
    db.close();
  }
}

export async function queueOfflineCheckIn(checkIn: QueuedCheckIn) {
  if (!available()) return;

  const db = await openDatabase();
  try {
    const transaction = db.transaction(QUEUE_STORE, "readwrite");
    await requestResult(transaction.objectStore(QUEUE_STORE).put(checkIn));
  } finally {
    db.close();
  }
}

export async function readQueuedCheckIns(eventId: string) {
  if (!available()) return [] as QueuedCheckIn[];

  const db = await openDatabase();
  try {
    const transaction = db.transaction(QUEUE_STORE, "readonly");
    const index = transaction.objectStore(QUEUE_STORE).index("by_event");
    const result = await requestResult(index.getAll(eventId));
    return (result as QueuedCheckIn[]).sort((a, b) => a.scannedAt - b.scannedAt);
  } finally {
    db.close();
  }
}

export async function removeQueuedCheckIns(ids: string[]) {
  if (!available() || ids.length === 0) return;

  const db = await openDatabase();
  try {
    const transaction = db.transaction(QUEUE_STORE, "readwrite");
    const store = transaction.objectStore(QUEUE_STORE);
    await Promise.all(ids.map((id) => requestResult(store.delete(id))));
  } finally {
    db.close();
  }
}

/** Delete one event's snapshot, queue, and opt-in marker. */
export async function clearDoorData(eventId?: string) {
  if (!available()) return;

  const db = await openDatabase();
  try {
    const meta = await readMeta(db);
    const target = eventId ?? meta?.eventId;
    if (!target) return;

    const snapshotTx = db.transaction(SNAPSHOT_STORE, "readwrite");
    await requestResult(snapshotTx.objectStore(SNAPSHOT_STORE).delete(target));

    const queueTx = db.transaction(QUEUE_STORE, "readwrite");
    const queueStore = queueTx.objectStore(QUEUE_STORE);
    const queued = (await requestResult(
      queueStore.index("by_event").getAll(target)
    )) as QueuedCheckIn[];
    await Promise.all(
      queued.map((item) => requestResult(queueStore.delete(item.id)))
    );

    if (meta?.eventId === target) {
      const metaTx = db.transaction(META_STORE, "readwrite");
      await requestResult(metaTx.objectStore(META_STORE).delete("active"));
    }
  } finally {
    db.close();
  }
}

/** Purge snapshots 24h after their event ends and scans older than 24h. */
export async function purgeExpiredDoorData(now = Date.now()) {
  if (!available()) return;

  const cutoff = now - RETENTION_MS;
  const db = await openDatabase();
  try {
    const snapshotTx = db.transaction(SNAPSHOT_STORE, "readonly");
    const snapshots = (await requestResult(
      snapshotTx.objectStore(SNAPSHOT_STORE).getAll()
    )) as CachedDoorSnapshot[];

    for (const snapshot of snapshots) {
      if ((snapshot.event.endDate ?? 0) + RETENTION_MS < now) {
        await clearDoorData(snapshot.eventId);
      }
    }

    const transaction = db.transaction(QUEUE_STORE, "readwrite");
    const store = transaction.objectStore(QUEUE_STORE);
    const all = (await requestResult(store.getAll())) as QueuedCheckIn[];
    await Promise.all(
      all
        .filter((item) => item.scannedAt < cutoff)
        .map((item) => requestResult(store.delete(item.id)))
    );
  } finally {
    db.close();
  }
}
