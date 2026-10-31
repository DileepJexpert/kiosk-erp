/**
 * Offline POS Storage & Sync Queue
 * Allows kiosk operators to continue billing without network interruptions.
 */

export interface OfflineBill {
  localId: string;
  timestamp: number;
  kioskId: string;
  items: {
    itemId: string;
    quantity: number;
    unitPrice: number;
  }[];
  paymentMode: "CASH" | "UPI" | "MIXED";
  cashAmount?: number;
  upiAmount?: number;
  upiRef?: string;
  customerPhone?: string;
  orderChannel?: string;
  total: number;
}

const STORAGE_KEY = "kiosk_offline_bills_queue";

export const offlineStorage = {
  isOnline(): boolean {
    if (typeof window === "undefined") return true;
    return navigator.onLine;
  },

  getQueue(): OfflineBill[] {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  getPendingCount(): number {
    return this.getQueue().length;
  },

  saveBill(bill: Omit<OfflineBill, "localId" | "timestamp">): OfflineBill {
    const queue = this.getQueue();
    const offlineItem: OfflineBill = {
      ...bill,
      localId: `offline_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
    };
    queue.push(offlineItem);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
      window.dispatchEvent(new CustomEvent("kiosk_offline_queue_updated", { detail: queue.length }));
    }
    return offlineItem;
  },

  removeBill(localId: string): void {
    const queue = this.getQueue().filter((b) => b.localId !== localId);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
      window.dispatchEvent(new CustomEvent("kiosk_offline_queue_updated", { detail: queue.length }));
    }
  },

  clearQueue(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
      window.dispatchEvent(new CustomEvent("kiosk_offline_queue_updated", { detail: 0 }));
    }
  },
};
