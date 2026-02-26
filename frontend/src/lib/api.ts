import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
});

// ---------------------------------------------------------------------------
// Circuit Breaker
// ---------------------------------------------------------------------------
// After CIRCUIT_THRESHOLD consecutive server-side failures the breaker opens
// and all outbound requests are rejected immediately for CIRCUIT_COOLDOWN ms.
// After the cooldown the breaker enters a half-open state: one probe request
// is allowed through. A success resets the counter; a failure reopens.
// ---------------------------------------------------------------------------

let consecutiveFailures = 0;
let circuitOpenUntil = 0;
const CIRCUIT_THRESHOLD = 5;
const CIRCUIT_COOLDOWN = 30_000; // 30 s

function isCircuitOpen(): boolean {
  if (consecutiveFailures >= CIRCUIT_THRESHOLD) {
    if (Date.now() < circuitOpenUntil) return true;
    // Half-open: let one probe through by backing the counter off by 1.
    consecutiveFailures = CIRCUIT_THRESHOLD - 1;
  }
  return false;
}

function recordSuccess(): void {
  consecutiveFailures = 0;
}

function recordFailure(): void {
  consecutiveFailures++;
  if (consecutiveFailures >= CIRCUIT_THRESHOLD) {
    circuitOpenUntil = Date.now() + CIRCUIT_COOLDOWN;
  }
}

/** Expose breaker state so ErrorBoundary / status bar can react. */
export function isCircuitBreakerOpen(): boolean {
  return isCircuitOpen();
}

// ---------------------------------------------------------------------------
// Simple request-ID generator (no extra dependency)
// ---------------------------------------------------------------------------
let _reqCounter = 0;
function nextRequestId(): string {
  return `${Date.now().toString(36)}-${(++_reqCounter).toString(36)}`;
}

// ---------------------------------------------------------------------------
// Request interceptor: auth token + correlation ID + circuit breaker guard
// ---------------------------------------------------------------------------
api.interceptors.request.use((config) => {
  if (isCircuitOpen()) {
    // Cancel() is the axios-native way to reject without triggering retries.
    return Promise.reject(
      new axios.Cancel('Circuit breaker open — server unavailable')
    );
  }

  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  config.headers['X-Request-Id'] = nextRequestId();

  return config;
});

// ---------------------------------------------------------------------------
// Retry config
// ---------------------------------------------------------------------------
interface RetryableConfig extends InternalAxiosRequestConfig {
  __retryCount?: number;
}

const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000]; // ms

function isRetryable(error: AxiosError): boolean {
  // Never retry client errors (4xx) — they won't self-heal.
  if (error.response && error.response.status < 500) return false;
  // Retry on no-response (network down), timeout (ECONNABORTED), or 5xx.
  return !error.response || error.response.status >= 500 || error.code === 'ECONNABORTED';
}

// ---------------------------------------------------------------------------
// Response interceptor: success tracking + 401 redirect + circuit breaker +
// exponential-backoff retry (all in one interceptor to avoid ordering issues)
// ---------------------------------------------------------------------------
api.interceptors.response.use(
  (response) => {
    recordSuccess();
    return response;
  },
  async (error: AxiosError) => {
    // Axios.Cancel is not a real error — don't process it further.
    if (axios.isCancel(error)) return Promise.reject(error);

    // 401 → session expired, bounce to login.
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      return Promise.reject(error);
    }

    // Update circuit-breaker state for server/network errors.
    const status = error.response?.status;
    if (!status || status >= 500 || error.code === 'ECONNABORTED') {
      recordFailure();
    }

    // Retry with exponential back-off.
    const config = error.config as RetryableConfig | undefined;
    if (!config) return Promise.reject(error);

    const retryCount = config.__retryCount ?? 0;
    if (retryCount < MAX_RETRIES && isRetryable(error)) {
      config.__retryCount = retryCount + 1;
      const delay = RETRY_DELAYS[retryCount] ?? 4000;
      await new Promise<void>((resolve) => setTimeout(resolve, delay));
      return api.request(config);
    }

    return Promise.reject(error);
  }
);

export default api;
