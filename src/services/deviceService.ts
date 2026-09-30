import { DeviceRecord } from '../types/sync';

const DEVICE_ID_KEY = 'cashflow_device_id';
const DEVICE_NAME_KEY = 'cashflow_device_name';
const KNOWN_DEVICES_KEY = 'cashflow_known_devices';

const getStorage = (): Storage | null => {
  if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
  if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) return (globalThis as any).localStorage;
  return null;
};

export function getOrCreateDeviceId(): string {
  const storage = getStorage();
  if (!storage) {
    return 'node_test_device_001';
  }
  let id = storage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = `dev_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    storage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

export function detectDevicePlatform(): string {
  if (typeof navigator === 'undefined') return 'NodeJS / Test';
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return 'Android';
  if (/iPad|iPhone|iPod/.test(ua)) return 'iOS';
  if (/Macintosh|Mac OS X/.test(ua)) return 'macOS';
  if (/Windows/.test(ua)) return 'Windows';
  if (/Linux/.test(ua)) return 'Linux';
  return 'Web / Desktop';
}

export function detectBrowserName(): string {
  if (typeof navigator === 'undefined') return 'Headless';
  const ua = navigator.userAgent;
  if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome';
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Edg')) return 'Edge';
  return 'Browser';
}

export function getDeviceFriendlyName(): string {
  if (typeof window === 'undefined' || !window.localStorage) return 'Default Device';
  const custom = localStorage.getItem(DEVICE_NAME_KEY);
  if (custom) return custom;

  const platform = detectDevicePlatform();
  const browser = detectBrowserName();
  return `${platform} (${browser})`;
}

export function setDeviceFriendlyName(name: string): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.setItem(DEVICE_NAME_KEY, name.trim());
  }
}

export function getCurrentDeviceRecord(): DeviceRecord {
  const deviceId = getOrCreateDeviceId();
  const name = getDeviceFriendlyName();
  const platform = detectDevicePlatform();
  const browser = detectBrowserName();
  const now = new Date().toISOString();

  return {
    deviceId,
    name,
    platform,
    browser,
    firstSeenAt: now,
    lastActiveAt: now,
    appVersion: '2.9.0',
    isCurrentDevice: true,
  };
}

export function getLocalKnownDevices(): DeviceRecord[] {
  const storage = getStorage();
  if (!storage) return [getCurrentDeviceRecord()];
  try {
    const raw = storage.getItem(KNOWN_DEVICES_KEY);
    if (!raw) return [getCurrentDeviceRecord()];
    const list = JSON.parse(raw) as DeviceRecord[];
    const currentId = getOrCreateDeviceId();
    return list.map((d) => ({
      ...d,
      isCurrentDevice: d.deviceId === currentId,
    }));
  } catch {
    return [getCurrentDeviceRecord()];
  }
}

export function saveLocalKnownDevices(devices: DeviceRecord[]): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(KNOWN_DEVICES_KEY, JSON.stringify(devices));
  } catch {
    // Ignore storage quota
  }
}
