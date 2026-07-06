/**
 * iTunes Search/Lookup API は約20コール/分に制限されているため、
 * プロセス内の呼び出しを直列化しつつ間隔を空けるだけの簡易キューを提供する。
 * MVP はローカル/単一サーバー構成のみを想定しているため、プロセス内メモリで十分。
 */
class RateLimitedQueue {
  private queue: Array<() => void> = [];
  private running = false;
  private lastRunAt = 0;

  constructor(private readonly minIntervalMs: number) {}

  async run<T>(task: () => Promise<T>): Promise<T> {
    await this.waitForSlot();
    return task();
  }

  private waitForSlot(): Promise<void> {
    return new Promise((resolve) => {
      this.queue.push(resolve);
      this.drain();
    });
  }

  private drain() {
    if (this.running) return;
    this.running = true;

    const step = () => {
      const next = this.queue.shift();
      if (!next) {
        this.running = false;
        return;
      }
      const wait = Math.max(0, this.minIntervalMs - (Date.now() - this.lastRunAt));
      setTimeout(() => {
        this.lastRunAt = Date.now();
        next();
        step();
      }, wait);
    };

    step();
  }
}

// 20コール/分 = 1コールにつき最低3秒の間隔を空ける
export const itunesLookupQueue = new RateLimitedQueue(3_000);
