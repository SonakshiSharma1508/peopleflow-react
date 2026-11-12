import { describe, expect, it } from 'vitest';
import { sessionReducer } from '../src/state/sessionReducer.js';
import { csvValue, directoryCSV } from '../src/utils/download.js';
import { createSeed } from '../src/seed.js';
import { STORAGE_KEY } from '../src/storage.js';

describe('React state and export boundaries', () => {
  it('keeps prepared transitions outside the reducer and returns their exact snapshot', () => {
    const before = { data: createSeed(), warning: null, recoveryMode: false };
    const next = { ...before, data: { ...before.data, role: 'IT' } };
    expect(sessionReducer(before, { type: 'session/replaced', session: next })).toBe(next);
    expect(before.data.role).toBe('HR');
    expect(sessionReducer(before, { type: 'unknown' })).toBe(before);
  });
  it('suspends persistence after a cross-tab conflict without discarding working data', () => {
    const before = { data: createSeed(), warning: null, recoveryMode: false };
    const after = sessionReducer(before, { type: 'session/conflict' });
    expect(after.data).toBe(before.data);
    expect(after.recoveryMode).toBe(true);
    expect(after.warning).toMatch(/another tab/);
    expect(before.recoveryMode).toBe(false);
  });
  it('uses a separate namespace from JavaScript v1', () => {
    expect(STORAGE_KEY).toBe('peopleflow.react.v2');
  });
  it('quotes CSV cells and neutralizes formula prefixes without HTML escaping', () => {
    expect(csvValue('=1+1')).toBe('"\'=1+1"');
    expect(csvValue('hello,"team"')).toBe('"hello,""team"""');
    expect(csvValue(null)).toBe('""');
    expect(csvValue('<b>plain</b>')).toBe('"<b>plain</b>"');
  });
  it('exports the full employee directory with headers and multiline-safe values', () => {
    const employees = createSeed().employees;
    const csv = directoryCSV(employees);
    expect(csv.startsWith('\uFEFF"Employee ID"')).toBe(true);
    expect(csv.split('\r\n')).toHaveLength(employees.length + 1);
    expect(csv).toContain('"EMP-1045"');
  });
});
