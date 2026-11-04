// Plan morning-digest, section 1. The contract every digest part builds on: commit this first,
// so the page, the JSON, the board link and the route tests can start against it.

export type RunStatus = 'ok' | 'retry' | 'fail';

// One line of runs/<night>.jsonl, after it parsed.
export type RunLine = {
  at: string; // ISO 8601 with the offset from the log. Keep the offset; never convert to UTC.
  job: string;
  status: RunStatus;
  owner: string | null;
  error?: string;
};

// One row per job for the night.
export type DigestRow = {
  job: string;
  owner: string | null; // owner of the job's last line; null renders as "—"
  runs: number; // lines for this job
  retries: number; // lines with status "retry"
  lastStatus: RunStatus;
  lastError: string | null; // error of the last line that has one; null renders as "—"
  firstAt: string; // `at` of the first line, as written in the log
  lastAt: string; // `at` of the last line, as written in the log
};

export type Night = {
  night: string; // YYYY-MM-DD
  rows: DigestRow[]; // sorted by job
  badLines: number; // lines that did not parse; counted, never thrown
};

// Implemented in src/digest/read.ts as `export const readNight: ReadNight`.
// Returns null when the night has no file, or when `night` is not YYYY-MM-DD.
// An empty file returns { rows: [], badLines: 0 }.
export type ReadNight = (runsDir: string, night: string) => Night | null;

// A retry count at or above this marks the row.
export const RETRY_MARK = 3;
