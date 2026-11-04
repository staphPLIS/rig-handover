import { describe, expect, it } from 'vitest';
import { countNight, countText } from '../src/digest/counts.js';

const line = (status: string) => JSON.stringify({ at: '2026-10-28T01:00:00+01:00', job: 'j', status, owner: null });

describe('countText', () => {
  it('counts lines per status and bad lines apart', () => {
    const text = [line('ok'), line('ok'), line('retry'), line('fail'), 'nope', '', '{"status":"ok"}'].join('\n');
    expect(countText(text)).toEqual({ ok: 2, retry: 1, fail: 1, bad: 2 });
  });
});

describe('countNight', () => {
  it('returns null for a missing night', () => {
    expect(countNight('runs', '1999-01-01')).toBeNull();
  });
});
