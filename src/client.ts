/**
 * TrueNAS REST API Client
 * Supports TrueNAS SCALE REST API v2.0
 */

export interface TrueNASClientConfig {
  baseUrl: string;
  apiKey: string;
  verifySsl?: boolean;
}

export interface JobResult {
  id: number;
  method: string;
  state: string;
  progress: { percent: number; description: string };
  result: unknown;
  error: string | null;
  time_started: { $date: number } | null;
  time_finished: { $date: number } | null;
}

export class TrueNASClient {
  private baseUrl: string;
  private apiKey: string;
  private verifySsl: boolean;

  constructor(config: TrueNASClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, "");
    this.apiKey = config.apiKey;
    this.verifySsl = config.verifySsl ?? true;

    if (!this.verifySsl) {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    }
  }

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
    };
  }

  private url(path: string): string {
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    return `${this.baseUrl}/api/v2.0${cleanPath}`;
  }

  async get<T = unknown>(path: string, params?: Record<string, unknown>): Promise<T> {
    let url = this.url(path);
    if (params) {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      }
      const qs = searchParams.toString();
      if (qs) url += `?${qs}`;
    }
    const res = await fetch(url, { method: "GET", headers: this.headers });
    return this.handleResponse<T>(res);
  }

  async post<T = unknown>(path: string, body?: unknown): Promise<T> {
    const res = await fetch(this.url(path), {
      method: "POST",
      headers: this.headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    return this.handleResponse<T>(res);
  }

  async put<T = unknown>(path: string, body?: unknown): Promise<T> {
    const res = await fetch(this.url(path), {
      method: "PUT",
      headers: this.headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    return this.handleResponse<T>(res);
  }

  async delete<T = unknown>(path: string, body?: unknown): Promise<T> {
    const res = await fetch(this.url(path), {
      method: "DELETE",
      headers: this.headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    return this.handleResponse<T>(res);
  }

  /** Wait for a long-running job to complete */
  async waitForJob(jobId: number, timeoutMs: number = 300000): Promise<JobResult> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const job = await this.get<JobResult>(`/core/get_jobs`, { id: jobId });
      const jobs = Array.isArray(job) ? job : [job];
      const target = jobs.find((j: any) => j.id === jobId) as JobResult | undefined;
      if (target) {
        if (target.state === "SUCCESS") return target;
        if (target.state === "FAILED") {
          throw new Error(`Job ${jobId} failed: ${target.error}`);
        }
        if (target.state === "ABORTED") {
          throw new Error(`Job ${jobId} was aborted`);
        }
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
    throw new Error(`Job ${jobId} timed out after ${timeoutMs}ms`);
  }

  private async handleResponse<T>(res: Response): Promise<T> {
    const text = await res.text();
    if (!res.ok) {
      let message = `TrueNAS API error ${res.status}: ${res.statusText}`;
      try {
        const err = JSON.parse(text);
        if (err.message) message = `TrueNAS API error ${res.status}: ${err.message}`;
        else if (typeof err === "string") message = `TrueNAS API error ${res.status}: ${err}`;
      } catch {
        if (text) message += ` — ${text.slice(0, 500)}`;
      }
      throw new Error(message);
    }
    if (!text || text === "null") return null as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      return text as T;
    }
  }

  /** Test connectivity */
  async ping(): Promise<boolean> {
    try {
      await this.get("/system/info");
      return true;
    } catch {
      return false;
    }
  }
}
