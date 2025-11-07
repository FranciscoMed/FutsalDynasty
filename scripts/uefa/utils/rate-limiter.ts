/**
 * Rate Limiter Utility
 * Ensures we don't overwhelm UEFA's servers
 */

export class RateLimiter {
  private requestsPerSecond: number;
  private minDelay: number;
  private lastRequestTime: number = 0;
  private requestCount: number = 0;

  constructor(requestsPerSecond: number = 2) {
    this.requestsPerSecond = requestsPerSecond;
    this.minDelay = 1000 / requestsPerSecond;
  }

  /**
   * Wait until it's safe to make the next request
   */
  async throttle(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.minDelay) {
      const waitTime = this.minDelay - timeSinceLastRequest;
      await this.delay(waitTime);
    }
    
    this.lastRequestTime = Date.now();
    this.requestCount++;
  }

  /**
   * Delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get request statistics
   */
  getStats() {
    return {
      totalRequests: this.requestCount,
      requestsPerSecond: this.requestsPerSecond,
      minDelay: this.minDelay,
    };
  }

  /**
   * Reset the rate limiter
   */
  reset(): void {
    this.requestCount = 0;
    this.lastRequestTime = 0;
  }
}

/**
 * Exponential backoff for retries
 */
export class ExponentialBackoff {
  private baseDelay: number;
  private maxDelay: number;
  private maxAttempts: number;

  constructor(
    baseDelay: number = 1000,
    maxDelay: number = 30000,
    maxAttempts: number = 3
  ) {
    this.baseDelay = baseDelay;
    this.maxDelay = maxDelay;
    this.maxAttempts = maxAttempts;
  }

  /**
   * Calculate delay for a given attempt
   */
  getDelay(attempt: number): number {
    const delay = this.baseDelay * Math.pow(2, attempt);
    return Math.min(delay, this.maxDelay);
  }

  /**
   * Execute a function with retries and exponential backoff
   */
  async execute<T>(
    fn: () => Promise<T>,
    onRetry?: (attempt: number, error: Error) => void
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < this.maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < this.maxAttempts - 1) {
          const delay = this.getDelay(attempt);
          
          if (onRetry) {
            onRetry(attempt + 1, lastError);
          }
          
          await this.delay(delay);
        }
      }
    }

    throw lastError || new Error('Max attempts reached');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Combined rate limiter with retry logic
 */
export class SmartFetcher {
  private rateLimiter: RateLimiter;
  private backoff: ExponentialBackoff;

  constructor(
    requestsPerSecond: number = 2,
    maxRetries: number = 3,
    baseRetryDelay: number = 1000
  ) {
    this.rateLimiter = new RateLimiter(requestsPerSecond);
    this.backoff = new ExponentialBackoff(baseRetryDelay, 30000, maxRetries);
  }

  /**
   * Fetch with rate limiting and automatic retries
   */
  async fetch<T>(
    url: string,
    options?: RequestInit,
    onRetry?: (attempt: number, error: Error) => void
  ): Promise<T> {
    await this.rateLimiter.throttle();

    return this.backoff.execute(
      async () => {
        const response = await fetch(url, options);
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error(`Not found: ${url}`);
          }
          if (response.status === 429) {
            throw new Error(`Rate limited: ${url}`);
          }
          throw new Error(`HTTP ${response.status}: ${url}`);
        }
        
        return await response.json() as T;
      },
      onRetry
    );
  }

  /**
   * Get statistics about requests made
   */
  getStats() {
    return this.rateLimiter.getStats();
  }

  /**
   * Reset all counters
   */
  reset(): void {
    this.rateLimiter.reset();
  }
}
