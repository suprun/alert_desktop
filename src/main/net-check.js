const net = require('net');

/**
 * Сервіс перевірки глобального підключення до Інтернету
 * шляхом прямого надшвидкого TCP-зондування Anycast IP-адрес Cloudflare та Google.
 */

const TARGETS_PRIMARY = [
  { host: '1.1.1.1', port: 53, provider: 'Cloudflare' },
  { host: '8.8.8.8', port: 53, provider: 'Google' },
  { host: '1.0.0.1', port: 53, provider: 'Cloudflare' },
  { host: '8.8.4.4', port: 53, provider: 'Google' }
];

const TARGETS_FALLBACK_PORT = [
  { host: '1.1.1.1', port: 443, provider: 'Cloudflare' },
  { host: '8.8.8.8', port: 443, provider: 'Google' }
];

let lastCheckResult = null;
let lastCheckTime = 0;
const CACHE_TTL_MS = 4000; // 4 секунди кешування для зменшення кількості сокетів

function probeSocket(target, timeoutMs = 1500) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    let isSettled = false;

    const socket = net.createConnection({
      host: target.host,
      port: target.port,
      timeout: timeoutMs
    });

    const cleanup = () => {
      if (!isSettled) {
        isSettled = true;
        try {
          socket.destroy();
        } catch (e) {
          // ignore destroy error
        }
      }
    };

    socket.on('connect', () => {
      const latencyMs = Date.now() - startTime;
      cleanup();
      resolve({
        connected: true,
        host: target.host,
        port: target.port,
        provider: target.provider,
        latencyMs
      });
    });

    socket.on('timeout', () => {
      cleanup();
      reject(new Error(`Timeout ${timeoutMs}ms to ${target.host}:${target.port}`));
    });

    socket.on('error', (err) => {
      cleanup();
      reject(err);
    });
  });
}

/**
 * Перевіряє наявність інтернет-з'єднання.
 * @param {object} options
 * @param {number} [options.timeout=1500]
 * @param {boolean} [options.force=false]
 * @returns {Promise<{ connected: boolean, host?: string, provider?: string, latencyMs?: number, cached?: boolean }>}
 */
async function checkInternetConnectivity(options = {}) {
  const force = options.force === true;
  const now = Date.now();

  if (!force && lastCheckResult && (now - lastCheckTime < CACHE_TTL_MS)) {
    return { ...lastCheckResult, cached: true };
  }

  const timeoutMs = options.timeout || 1500;

  try {
    // 1. Паралельне опитування Cloudflare та Google на порту 53 (найшвидший DNS Anycast handshake)
    const primaryProbes = TARGETS_PRIMARY.map(t => probeSocket(t, timeoutMs));
    const result = await Promise.any(primaryProbes);

    lastCheckResult = {
      connected: true,
      host: result.host,
      provider: result.provider,
      latencyMs: result.latencyMs
    };
    lastCheckTime = now;
    return lastCheckResult;
  } catch (err) {
    // 2. Якщо порт 53 заблоковано локальним файрволом, перевіряємо порт 443 (HTTPS)
    try {
      const fallbackProbes = TARGETS_FALLBACK_PORT.map(t => probeSocket(t, timeoutMs));
      const fbResult = await Promise.any(fallbackProbes);

      lastCheckResult = {
        connected: true,
        host: fbResult.host,
        provider: fbResult.provider,
        latencyMs: fbResult.latencyMs
      };
      lastCheckTime = now;
      return lastCheckResult;
    } catch (fbErr) {
      // Усі IP-адреси Cloudflare та Google недоступні -> інтернет відсутній
      lastCheckResult = {
        connected: false,
        host: null,
        provider: null,
        latencyMs: 0
      };
      lastCheckTime = now;
      return lastCheckResult;
    }
  }
}

module.exports = {
  checkInternetConnectivity,
  probeSocket,
  TARGETS_PRIMARY,
  TARGETS_FALLBACK_PORT
};
