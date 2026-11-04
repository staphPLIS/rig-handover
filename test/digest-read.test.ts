import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readNight } from '../src/digest/read.js';

describe('readNight', () => {
  it('reads 2026-10-28: 5 jobs, 1 bad line', () => {
    const night = readNight('runs', '2026-10-28');
    expect(night).not.toBeNull();
    expect(night!.badLines).toBe(1);
    expect(night!.rows.map((r) => r.job)).toEqual([
      'digest/render',
      'fixtures/refresh',
      'lane/sync',
      'notes/backup',
      'rig/rotate-logs',
    ]);
    const byJob = Object.fromEntries(night!.rows.map((r) => [r.job, r]));
    expect(byJob['fixtures/refresh']).toMatchObject({
      runs: 4,
      retries: 3,
      lastStatus: 'ok',
      lastError: 'upstream 503',
      firstAt: '2026-10-29T01:30:00+01:00',
      lastAt: '2026-10-29T01:37:00+01:00',
    });
    expect(byJob['notes/backup']).toMatchObject({ lastStatus: 'fail', lastError: 'quota exceeded' });
    expect(byJob['digest/render']).toMatchObject({ owner: null, lastError: null });
    expect(byJob['lane/sync']).toMatchObject({ runs: 8, retries: 1, lastStatus: 'ok' });
  });

  it('returns null for a night with no file or a bad name', () => {
    expect(readNight('runs', '2026-01-01')).toBeNull();
    expect(readNight('runs', '../package')).toBeNull();
  });

  it('an empty file has no rows', () => {
    const dir = mkdtempSync(join(tmpdir(), 'rig-runs-'));
    writeFileSync(join(dir, '2026-11-01.jsonl'), '');
    expect(readNight(dir, '2026-11-01')).toEqual({ night: '2026-11-01', rows: [], badLines: 0 });
  });

  it('counts lines with a wrong shape as bad lines', () => {
    const dir = mkdtempSync(join(tmpdir(), 'rig-runs-'));
    writeFileSync(
      join(dir, '2026-11-02.jsonl'),
      ['{"at":"x","job":"a","status":"maybe","owner":"r"}', '[]', '{"at":"x","job":"a","status":"ok","owner":"r"}'].join('\n'),
    );
    const night = readNight(dir, '2026-11-02')!;
    expect(night.badLines).toBe(2);
    expect(night.rows).toHaveLength(1);
  });
});
