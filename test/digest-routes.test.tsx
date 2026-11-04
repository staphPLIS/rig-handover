import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { Night } from '../src/digest/types.js';

// Fixtures live in a temp dir, never in runs/ (read-only real nights).
const runsDir = mkdtempSync(join(tmpdir(), 'rig-routes-'));

const config = {
  adapter: 'shim',
  installed: '2026-10-29T14:06:00+01:00',
  beatEverySeconds: 60,
  runsDir,
};

const WITH_FILE = '2026-11-01';
const EMPTY = '2026-11-02';
const BAD_LINE = '2026-11-03';
const NO_FILE = '2026-01-01';

// Input order is deliberately not sorted by job.
const JOBS_WITH_FILE = ['digest/render', 'lane/sync', 'notes/backup'];

beforeAll(() => {
  writeFileSync(
    join(runsDir, `${WITH_FILE}.jsonl`),
    [
      '{"at":"2026-11-01T01:10:00+01:00","job":"notes/backup","status":"fail","owner":"mika","error":"quota exceeded"}',
      '{"at":"2026-11-01T01:00:00+01:00","job":"lane/sync","status":"retry","owner":"rook"}',
      '{"at":"2026-11-01T01:05:00+01:00","job":"lane/sync","status":"ok","owner":"rook"}',
      '{"at":"2026-11-01T01:20:00+01:00","job":"digest/render","status":"ok","owner":null}',
    ].join('\n'),
  );
  writeFileSync(join(runsDir, `${EMPTY}.jsonl`), '');
  writeFileSync(
    join(runsDir, `${BAD_LINE}.jsonl`),
    [
      '{"at":"2026-11-03T02:00:00+01:00","job":"notes/backup","status":"ok","owner":"mika"}',
      'this line is not JSON',
      '{"at":"2026-11-03T02:05:00+01:00","job":"lane/sync","status":"ok","owner":"rook"}',
    ].join('\n'),
  );
});

describe('GET /digest/:night', () => {
  it('renders every job of a night with a file', async () => {
    const res = await createApp(config).request(`/digest/${WITH_FILE}`);
    const html = await res.text();
    expect(res.status).toBe(200);
    for (const job of JOBS_WITH_FILE) expect(html).toContain(job);
  });

  it('returns 404 for a night with no file', async () => {
    const res = await createApp(config).request(`/digest/${NO_FILE}`);
    expect(res.status).toBe(404);
  });

  it('says "nothing ran" for an empty file', async () => {
    const res = await createApp(config).request(`/digest/${EMPTY}`);
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('nothing ran');
  });

  it('renders the good jobs of a night with a bad line and says so', async () => {
    const res = await createApp(config).request(`/digest/${BAD_LINE}`);
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('lane/sync');
    expect(html).toContain('notes/backup');
    expect(html).toContain('did not parse');
  });
});

describe('GET /api/digest/:night', () => {
  it('returns night, rows sorted by job, and badLines for a night with a file', async () => {
    const res = await createApp(config).request(`/api/digest/${WITH_FILE}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Night;
    expect(body).toMatchObject({ night: WITH_FILE, badLines: 0 });
    expect(body.rows.map((r) => r.job)).toEqual(JOBS_WITH_FILE);
    for (const row of body.rows) expect(typeof row.job).toBe('string');
  });

  it('returns 404 for a night with no file', async () => {
    const res = await createApp(config).request(`/api/digest/${NO_FILE}`);
    expect(res.status).toBe(404);
  });

  it('returns no rows and zero bad lines for an empty file', async () => {
    const res = await createApp(config).request(`/api/digest/${EMPTY}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Night;
    expect(body.rows).toEqual([]);
    expect(body.badLines).toBe(0);
  });

  it('counts the bad line and keeps the good rows', async () => {
    const res = await createApp(config).request(`/api/digest/${BAD_LINE}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Night;
    expect(body.badLines).toBe(1);
    expect(body.rows.map((r) => r.job)).toEqual(['lane/sync', 'notes/backup']);
  });

  it('lists jobs in the same order as the page HTML', async () => {
    const app = createApp(config);
    const pageRes = await app.request(`/digest/${WITH_FILE}`);
    expect(pageRes.status).toBe(200);
    const html = await pageRes.text();

    const jsonRes = await app.request(`/api/digest/${WITH_FILE}`);
    expect(jsonRes.status).toBe(200);
    const body = (await jsonRes.json()) as Night;
    const jobs = body.rows.map((r) => r.job);

    const positions = jobs.map((job) => html.indexOf(job));
    for (const pos of positions) expect(pos).toBeGreaterThanOrEqual(0);

    const pageOrder = [...jobs].sort((a, b) => html.indexOf(a) - html.indexOf(b));
    expect(jobs).toEqual(pageOrder);
  });
});
