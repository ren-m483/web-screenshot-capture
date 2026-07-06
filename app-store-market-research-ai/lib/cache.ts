export function minutesAgo(minutes: number): Date {
  return new Date(Date.now() - minutes * 60_000);
}

export function isFresh(fetchedAt: Date, maxAgeMinutes: number): boolean {
  return fetchedAt.getTime() > minutesAgo(maxAgeMinutes).getTime();
}
