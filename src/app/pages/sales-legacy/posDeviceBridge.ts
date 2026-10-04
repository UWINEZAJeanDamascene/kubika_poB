type SerialPrinterPort = {
  open: (options: { baudRate: number }) => Promise<void>;
  close: () => Promise<void>;
  getInfo: () => { usbVendorId?: number; usbProductId?: number };
  writable: WritableStream<Uint8Array> | null;
};

type WebSerialManager = {
  getPorts: () => Promise<SerialPrinterPort[]>;
};

type PosDeviceConfig = {
  baudRate: number;
  usbVendorId?: number;
  usbProductId?: number;
  autoKickCashDrawer: boolean;
  registerId: string;
  registerName: string;
};

const configKey = (companyId: string) => `kubika:pos-device:${companyId}`;

function getSerialManager(): WebSerialManager | undefined {
  return (navigator as Navigator & { serial?: WebSerialManager }).serial;
}

export function getPosDeviceConfig(companyId: string): PosDeviceConfig {
  try {
    const config = JSON.parse(localStorage.getItem(configKey(companyId)) || '{}');
    const registerId = typeof config.registerId === 'string' && /^[a-zA-Z0-9:_-]{1,80}$/.test(config.registerId)
      ? config.registerId
      : `reg-${crypto.randomUUID()}`;
    const registerName = typeof config.registerName === 'string' && config.registerName.trim()
      ? config.registerName.trim().slice(0, 120)
      : `Register ${registerId.slice(-4).toUpperCase()}`;
    if (!config.registerId) localStorage.setItem(configKey(companyId), JSON.stringify({ ...config, registerId, registerName }));
    return {
      baudRate: Number(config.baudRate) || 9600,
      usbVendorId: Number.isInteger(config.usbVendorId) ? config.usbVendorId : undefined,
      usbProductId: Number.isInteger(config.usbProductId) ? config.usbProductId : undefined,
      autoKickCashDrawer: config.autoKickCashDrawer === true,
      registerId,
      registerName,
    };
  } catch {
    const registerId = `reg-${crypto.randomUUID()}`;
    return { baudRate: 9600, autoKickCashDrawer: false, registerId, registerName: `Register ${registerId.slice(-4).toUpperCase()}` };
  }
}

export function updatePosDeviceConfig(companyId: string, updates: Partial<PosDeviceConfig>) {
  localStorage.setItem(configKey(companyId), JSON.stringify({ ...getPosDeviceConfig(companyId), ...updates }));
}

/** Opens a drawer only when a manager opted in and the previously authorized USB serial device matches. */
export async function kickDrawerAfterCashSale(companyId: string): Promise<boolean> {
  if (!window.isSecureContext) return false;
  const config = getPosDeviceConfig(companyId);
  if (!config.autoKickCashDrawer || config.usbVendorId == null || config.usbProductId == null) return false;

  const serial = getSerialManager();
  if (!serial) return false;
  const ports = await serial.getPorts();
  const matches = ports.filter((port) => {
    const info = port.getInfo();
    return info.usbVendorId === config.usbVendorId && info.usbProductId === config.usbProductId;
  });
  // Do not guess if two identical printers are connected.
  if (matches.length !== 1) return false;

  const port = matches[0];
  await port.open({ baudRate: config.baudRate });
  try {
    if (!port.writable) return false;
    const writer = port.writable.getWriter();
    try {
      // ESC/POS pulse pin 2. The device must have a compatible drawer port.
      await writer.write(new Uint8Array([0x1b, 0x70, 0x00, 0x19, 0xfa]));
      return true;
    } finally {
      writer.releaseLock();
    }
  } finally {
    await port.close().catch(() => undefined);
  }
}
