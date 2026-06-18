import { useCallback, useEffect, useState } from "react";
import type { CarbonApiResponse } from "../types/carbon";

const DEVICE_ID_KEY = "carbon_device_id";
const HISTORY_KEY_PREFIX = "carbon_history_";
const MAX_HISTORY_ENTRIES = 50;

export interface HistoryEntry {
  id: string;
  recordedAt: string;
  totalKgCo2e: number;
  snapshot: CarbonApiResponse;
}

interface DeviceHistoryStore {
  deviceId: string;
  entries: HistoryEntry[];
}

function historyStorageKey(deviceId: string): string {
  return `${HISTORY_KEY_PREFIX}${deviceId}`;
}

function readHistory(deviceId: string): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(historyStorageKey(deviceId));
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as DeviceHistoryStore | HistoryEntry[];
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return parsed.entries ?? [];
  } catch {
    return [];
  }
}

function writeHistory(deviceId: string, entries: HistoryEntry[]): void {
  const payload: DeviceHistoryStore = { deviceId, entries };
  localStorage.setItem(historyStorageKey(deviceId), JSON.stringify(payload));
}

function getOrCreateDeviceId(): string {
  const existing = localStorage.getItem(DEVICE_ID_KEY);
  if (existing) {
    return existing;
  }
  const newId = crypto.randomUUID();
  localStorage.setItem(DEVICE_ID_KEY, newId);
  return newId;
}

export function useDeviceHistory() {
  const [deviceId, setDeviceId] = useState<string>("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    const id = getOrCreateDeviceId();
    setDeviceId(id);
    setHistory(readHistory(id));
  }, []);

  const saveSnapshot = useCallback(
    (snapshot: CarbonApiResponse) => {
      if (!deviceId) {
        return;
      }

      const entry: HistoryEntry = {
        id: crypto.randomUUID(),
        recordedAt: new Date().toISOString(),
        totalKgCo2e: snapshot.total_kg_co2e,
        snapshot,
      };

      setHistory((previous) => {
        const next = [...previous, entry].slice(-MAX_HISTORY_ENTRIES);
        writeHistory(deviceId, next);
        return next;
      });
    },
    [deviceId],
  );

  const clearHistory = useCallback(() => {
    if (!deviceId) {
      return;
    }
    localStorage.removeItem(historyStorageKey(deviceId));
    setHistory([]);
  }, [deviceId]);

  return {
    deviceId,
    history,
    saveSnapshot,
    clearHistory,
  };
}
