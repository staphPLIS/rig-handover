import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseLine } from './read.js';

// Lines per status for one night. Lines, not rows; bad lines counted apart.
export type NightCounts = { ok: number; retry: number; fail: number; bad: number };

export function countText(text: string): NightCounts {
  const counts: NightCounts = { ok: 0, retry: 0, fail: 0, bad: 0 };
  for (const raw of text.split('\n')) {
    if (raw.trim() === '') continue;
    const line = parseLine(raw);
    if (line) counts[line.status]++;
    else counts.bad++;
  }
  return counts;
}

// null when the file cannot be read (renders as "—").
export function countNight(runsDir: string, night: string): NightCounts | null {
  try {
    return countText(readFileSync(join(runsDir, `${night}.jsonl`), 'utf8'));
  } catch {
    return null;
  }
}
