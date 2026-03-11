// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// POS Offline Queue & Sync
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Stores pending orders in IndexedDB when offline. Syncs when connectivity returns.

const DB_NAME = "pos_offline";
const DB_VERSION = 1;
const STORE_NAME = "pending_orders";

export interface PendingOrder {
  id: string;
  payload: Record<string, unknown>;
  receiptData: Record<string, unknown>;
  createdAt: number;
  retries: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function savePendingOrder(order: PendingOrder): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(order);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPendingOrders(): Promise<PendingOrder[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function removePendingOrder(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function updatePendingOrder(order: PendingOrder): Promise<void> {
  return savePendingOrder(order);
}

export async function getPendingCount(): Promise<number> {
  const orders = await getPendingOrders();
  return orders.length;
}

export async function syncPendingOrders(
  onSuccess?: (order: PendingOrder, result: Record<string, unknown>) => void,
  onError?: (order: PendingOrder, error: Error) => void
): Promise<{ synced: number; failed: number }> {
  const pending = await getPendingOrders();
  let synced = 0;
  let failed = 0;

  for (const order of pending) {
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(order.payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const result = await res.json();
      await removePendingOrder(order.id);
      synced++;
      onSuccess?.(order, result);
    } catch (err) {
      failed++;
      order.retries++;
      await updatePendingOrder(order);
      onError?.(order, err instanceof Error ? err : new Error("Sync failed"));
    }
  }

  return { synced, failed };
}
