import test from 'node:test';
import assert from 'node:assert/strict';
import {
  todayISO,
  addDays,
  daysUntil,
  getProgress,
  getTaskState,
  getJourneyStatus,
  canCompleteTask,
  toggleTask,
  setAssetReturned,
  completeJourney,
  createEmployee,
  addNote,
  startOffboarding,
  assignAsset,
} from '../src/domain.js';
import { createSeed, DEPARTMENTS } from '../src/seed.js';
import { loadState, saveState, STORAGE_KEY } from '../src/storage.js';

const TODAY = '2026-10-21';
const fresh = () => createSeed(TODAY);
const newPerson = () => ({
  id: 'EMP-1099',
  name: 'Taylor Singh',
  title: 'Frontend Engineer',
  department: 'Engineering',
  location: 'Remote',
  email: 'taylor.singh@example.com',
  manager: 'Nikhil Rao',
  date: '2026-11-02',
});
const find = (state, id) => state.employees.find((employee) => employee.id === id);
function memoryStorage(initial = null) {
  let value = initial;
  return {
    getItem: (key) => (key === STORAGE_KEY ? value : null),
    setItem: (key, next) => {
      assert.equal(key, STORAGE_KEY);
      value = next;
    },
    read: () => value,
  };
}

test('calendar helpers preserve date-only values across leap days and DST boundaries', () => {
  assert.equal(addDays('2024-02-28', 1), '2024-02-29');
  assert.equal(addDays('2024-02-29', 1), '2024-03-01');
  assert.equal(addDays('2026-03-08', 1), '2026-03-09');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(daysUntil('2026-03-09', '2026-03-07'), 2);
  assert.equal(daysUntil('2026-10-20', TODAY), -1);
  assert.equal(todayISO(new Date(2026, 9, 21, 23, 59)), TODAY);
});

test('calendar helpers reject rollover dates and malformed input', () => {
  for (const value of [
    '2026-02-29',
    '2026-13-01',
    '2026-00-01',
    '2026-04-31',
    '21/10/2026',
    null,
    '2026-1-01',
  ])
    assert.throws(() => addDays(value, 1), /valid/);
  assert.throws(() => addDays(TODAY, 0.5), /whole number/);
  assert.throws(() => todayISO(new Date('invalid')), /valid date/);
});

test('seed contains varied fictional journeys, relative dates, and valid persistent records', () => {
  const state = fresh();
  assert.equal(state.employees.length, 14);
  assert.equal(state.employees.filter((employee) => employee.journey === 'offboarding').length, 2);
  assert.equal(state.employees.filter((employee) => employee.journey === 'active').length, 5);
  assert.equal(
    state.employees.filter((employee) => getJourneyStatus(employee, TODAY) === 'complete').length,
    1,
  );
  assert.equal(find(state, 'EMP-1042').date, '2026-10-25');
  assert.equal(DEPARTMENTS.length, 7);
  assert.equal(saveState(state, memoryStorage()).ok, true);
  assert.equal(find(createSeed('2027-01-01'), 'EMP-1042').date, '2027-01-05');
});

test('task progress includes optional tasks while risk reflects overdue required work', () => {
  const employee = find(fresh(), 'EMP-1042');
  assert.deepEqual(getProgress(employee), { completed: 3, total: 7, percent: 43 });
  assert.equal(getJourneyStatus(employee, TODAY), 'in-progress');
  assert.equal(getJourneyStatus(find(fresh(), 'EMP-1044'), TODAY), 'at-risk');
  assert.deepEqual(getProgress({ tasks: [] }), { completed: 0, total: 0, percent: 0 });
});

test('task state prioritizes completion and dependencies, and due today is not overdue', () => {
  const state = createEmployee(fresh(), newPerson(), 'HR');
  const employee = find(state, 'EMP-1099');
  assert.equal(getTaskState(employee, employee.tasks[1], '2026-12-01'), 'blocked');
  assert.equal(getTaskState(employee, employee.tasks[0], '2026-10-30'), 'pending');
  assert.equal(getTaskState(employee, employee.tasks[0], '2026-10-31'), 'overdue');
  const next = toggleTask(state, employee.id, employee.tasks[0].id, 'HR');
  assert.equal(
    getTaskState(find(next, employee.id), find(next, employee.id).tasks[0], TODAY),
    'completed',
  );
});

test('ownership is enforced for completing and reopening tasks', () => {
  const state = fresh();
  const employee = find(state, 'EMP-1042');
  const equipment = employee.tasks.find((task) => task.id.endsWith('-equipment'));
  assert.equal(canCompleteTask(employee, equipment, 'HR').allowed, false);
  assert.throws(() => toggleTask(state, employee.id, equipment.id, 'Manager'), /Only IT/);
  assert.throws(() => toggleTask(state, employee.id, equipment.id, 'Admin'), /Choose HR/);
  const next = toggleTask(state, employee.id, equipment.id, 'IT');
  assert.equal(
    find(next, employee.id).tasks.find((task) => task.id === equipment.id).completed,
    true,
  );
  assert.throws(() => toggleTask(next, employee.id, equipment.id, 'HR'), /Only IT/);
});

test('task completion preserves the input state and records an attributable event', () => {
  const state = fresh();
  const before = structuredClone(state);
  const employee = find(state, 'EMP-1047');
  const next = toggleTask(state, employee.id, employee.tasks[1].id, 'HR');
  assert.deepEqual(state, before);
  assert.equal(next.activity[0].actor, 'HR');
  assert.equal(next.activity[0].employeeId, employee.id);
  assert.match(next.activity[0].message, /Completed/);
  assert.ok(find(next, employee.id).tasks[1].completedAt);
});

test('prerequisites block completion and cannot be reopened under completed dependents', () => {
  const state = createEmployee(fresh(), newPerson(), 'HR');
  const employee = find(state, 'EMP-1099');
  assert.throws(() => toggleTask(state, employee.id, employee.tasks[1].id, 'HR'), /prerequisite/);
  let next = toggleTask(state, employee.id, employee.tasks[0].id, 'HR');
  next = toggleTask(next, employee.id, employee.tasks[1].id, 'HR');
  assert.throws(() => toggleTask(next, employee.id, employee.tasks[0].id, 'HR'), /dependent tasks/);
  next = toggleTask(next, employee.id, employee.tasks[1].id, 'HR');
  next = toggleTask(next, employee.id, employee.tasks[0].id, 'HR');
  assert.equal(find(next, employee.id).tasks[0].completedAt, null);
});

test('completed journeys are read-only, including active employee checklist history', () => {
  const state = fresh();
  const employee = find(state, 'EMP-1001');
  assert.equal(getJourneyStatus(employee, TODAY), 'active');
  assert.throws(() => toggleTask(state, employee.id, employee.tasks[0].id, 'HR'), /read-only/);
});

test('only HR can create an employee and input is normalized with a fresh checklist', () => {
  const state = fresh();
  assert.throws(() => createEmployee(state, newPerson(), 'IT'), /Only HR/);
  const next = createEmployee(
    state,
    {
      ...newPerson(),
      id: 'emp-1099',
      name: '  Taylor   Singh ',
      email: ' TAYLOR.SINGH@EXAMPLE.COM ',
    },
    'HR',
  );
  const employee = find(next, 'EMP-1099');
  assert.equal(employee.name, 'Taylor Singh');
  assert.equal(employee.email, 'taylor.singh@example.com');
  assert.equal(employee.journey, 'onboarding');
  assert.equal(employee.tasks.length, 7);
  assert.equal(employee.tasks[1].dependsOn[0], employee.tasks[0].id);
  assert.equal(state.employees.length, 14);
});

test('employee creation rejects duplicate IDs and emails case-insensitively', () => {
  const state = fresh();
  assert.throws(
    () => createEmployee(state, { ...newPerson(), id: 'emp-1042' }, 'HR'),
    /ID already exists/,
  );
  assert.throws(
    () => createEmployee(state, { ...newPerson(), email: 'AISHA.SHARMA@EXAMPLE.COM' }, 'HR'),
    /already belongs/,
  );
});

test('employee creation rejects invalid fields instead of silently accepting them', () => {
  for (const change of [
    { name: '' },
    { title: ' ' },
    { email: 'invalid' },
    { date: '2026-02-30' },
    { id: '<script>' },
    { manager: '' },
    { location: 'x'.repeat(81) },
  ])
    assert.throws(() => createEmployee(fresh(), { ...newPerson(), ...change }, 'HR'));
  assert.throws(() => createEmployee(fresh(), null, 'HR'), /details/);
});

test('only HR can close a journey, required tasks are enforced, optional tasks may remain', () => {
  const state = fresh();
  assert.throws(() => completeJourney(state, 'EMP-1041', 'Manager'), /Only HR/);
  assert.throws(() => completeJourney(state, 'EMP-1042', 'HR'), /required tasks/);
  find(state, 'EMP-1041').tasks.find((task) => !task.required).completed = false;
  const next = completeJourney(state, 'EMP-1041', 'HR');
  assert.equal(find(next, 'EMP-1041').journey, 'active');
  assert.equal(find(state, 'EMP-1041').journey, 'onboarding');
  assert.throws(() => completeJourney(next, 'EMP-1041', 'HR'), /no open journey/);
});

test('offboarding equipment task stays blocked until every asset has returned', () => {
  const state = fresh();
  const employee = find(state, 'EMP-1021');
  const task = employee.tasks.find((item) => item.kind === 'asset-return');
  assert.equal(getTaskState(employee, task, TODAY), 'blocked');
  assert.throws(() => toggleTask(state, employee.id, task.id, 'IT'), /every assigned asset/);
  assert.throws(
    () => setAssetReturned(state, employee.id, employee.assets[0].id, true, 'HR'),
    /Only IT/,
  );
  const returned = setAssetReturned(state, employee.id, employee.assets[0].id, true, 'IT');
  const next = toggleTask(returned, employee.id, task.id, 'IT');
  assert.equal(find(next, employee.id).tasks.find((item) => item.id === task.id).completed, true);
  assert.equal(employee.assets[0].returned, false);
  assert.throws(
    () => setAssetReturned(next, employee.id, employee.assets[0].id, false, 'IT'),
    /Reopen/,
  );
});

test('only IT can assign equipment and assignments remain immutable and attributable', () => {
  const state = fresh();
  const before = structuredClone(state);
  assert.throws(
    () => assignAsset(state, 'EMP-1047', { name: 'Laptop', serial: 'PF-NEW-1' }, 'HR'),
    /Only IT/,
  );
  assert.throws(
    () => assignAsset(state, 'EMP-1047', { name: 'Laptop', serial: 'PF-NEW-1' }, 'Manager'),
    /Only IT/,
  );
  const next = assignAsset(
    state,
    'EMP-1047',
    { name: '  Lenovo   ThinkPad ', serial: ' pf-new-1 ' },
    'IT',
  );
  assert.deepEqual(state, before);
  const asset = find(next, 'EMP-1047').assets[0];
  assert.equal(asset.name, 'Lenovo ThinkPad');
  assert.equal(asset.serial, 'PF-NEW-1');
  assert.equal(asset.returned, false);
  assert.ok(asset.id);
  assert.equal(next.activity[0].actor, 'IT');
  assert.match(next.activity[0].message, /Assigned Lenovo ThinkPad/);
  assert.equal(saveState(next, memoryStorage()).ok, true);
});

test('equipment serials cannot be duplicated across employees with outstanding assets', () => {
  const state = fresh();
  assert.throws(
    () => assignAsset(state, 'EMP-1047', { name: 'Laptop', serial: 'pf-mba-1042' }, 'IT'),
    /already assigned/,
  );
  const next = assignAsset(state, 'EMP-1047', { name: 'Laptop', serial: 'PF-NEW-1' }, 'IT');
  assert.throws(
    () => assignAsset(next, 'EMP-1047', { name: 'Laptop', serial: 'pf-new-1' }, 'IT'),
    /already assigned/,
  );
  assert.throws(
    () => assignAsset(next, 'EMP-1045', { name: 'Laptop', serial: 'PF-NEW-1' }, 'IT'),
    /already assigned/,
  );
});

test('returned and departed equipment serials can be reassigned', () => {
  const state = fresh();
  // Maya has already returned her office access card in the seed.
  const reused = assignAsset(
    state,
    'EMP-1047',
    { name: 'Office access card', serial: 'PF-ID-1021' },
    'IT',
  );
  assert.equal(find(reused, 'EMP-1047').assets[0].serial, 'PF-ID-1021');
  find(state, 'EMP-1021').journey = 'departed';
  const departed = assignAsset(state, 'EMP-1047', { name: 'Laptop', serial: 'PF-MBA-1021' }, 'IT');
  assert.equal(find(departed, 'EMP-1047').assets[0].serial, 'PF-MBA-1021');
});

test('equipment assignment validates input and is limited to onboarding or active employees', () => {
  const state = fresh();
  for (const input of [
    null,
    { name: '', serial: '123' },
    { name: 'Laptop', serial: ' ' },
    { name: 'x'.repeat(101), serial: '123' },
    { name: 'Laptop', serial: 'x'.repeat(81) },
  ])
    assert.throws(() => assignAsset(state, 'EMP-1047', input, 'IT'));
  assert.throws(
    () => assignAsset(state, 'missing', { name: 'Laptop', serial: 'NEW' }, 'IT'),
    /employee could not be found/,
  );
  assert.throws(
    () => assignAsset(state, 'EMP-1021', { name: 'Laptop', serial: 'NEW' }, 'IT'),
    /onboarding or active/,
  );
  find(state, 'EMP-1021').journey = 'departed';
  assert.throws(
    () => assignAsset(state, 'EMP-1021', { name: 'Laptop', serial: 'NEW' }, 'IT'),
    /onboarding or active/,
  );
  assert.equal(
    find(assignAsset(state, 'EMP-1001', { name: 'Monitor', serial: 'PF-MON-1' }, 'IT'), 'EMP-1001')
      .assets.length,
    3,
  );
});

test('onboarding equipment task requires an actual assignment as well as account provisioning', () => {
  let state = createEmployee(fresh(), newPerson(), 'HR');
  let employee = find(state, 'EMP-1099');
  state = toggleTask(state, employee.id, employee.tasks[0].id, 'HR');
  state = toggleTask(state, employee.id, employee.tasks[2].id, 'IT');
  employee = find(state, employee.id);
  const task = employee.tasks.find((item) => item.kind === 'asset-assignment');
  assert.equal(getTaskState(employee, task, TODAY), 'blocked');
  assert.match(canCompleteTask(employee, task, 'IT').reason, /Assign at least one/);
  assert.throws(() => toggleTask(state, employee.id, task.id, 'IT'), /Assign at least one/);
  state = assignAsset(state, employee.id, { name: 'Laptop', serial: 'PF-NEW-1099' }, 'IT');
  employee = find(state, employee.id);
  assert.equal(
    getTaskState(
      employee,
      employee.tasks.find((item) => item.id === task.id),
      TODAY,
    ),
    'pending',
  );
  state = toggleTask(state, employee.id, task.id, 'IT');
  assert.equal(find(state, employee.id).tasks.find((item) => item.id === task.id).completed, true);
});

test('closing an exit independently checks equipment even if its checklist is tampered with', () => {
  const state = fresh();
  const employee = find(state, 'EMP-1021');
  employee.tasks.forEach((task) => {
    task.completed = true;
  });
  assert.throws(() => completeJourney(state, employee.id, 'HR'), /all assigned assets/);
});

test('an entire exit can be completed in dependency order and becomes read-only', () => {
  let state = fresh();
  const id = 'EMP-1021';
  let employee = find(state, id);
  for (const asset of employee.assets) state = setAssetReturned(state, id, asset.id, true, 'IT');
  employee = find(state, id);
  for (const task of employee.tasks)
    if (!task.completed) state = toggleTask(state, id, task.id, task.owner);
  state = completeJourney(state, id, 'HR');
  employee = find(state, id);
  assert.equal(employee.journey, 'departed');
  assert.equal(getJourneyStatus(employee, TODAY), 'complete');
  assert.throws(() => toggleTask(state, id, employee.tasks[0].id, 'HR'), /read-only/);
  assert.throws(() => addNote(state, id, 'Late note', 'HR'), /archived/);
});

test('offboarding can only begin from active employment, retaining assets and activity', () => {
  const state = fresh();
  assert.throws(() => startOffboarding(state, 'EMP-1042', '2026-11-01', 'HR'), /only be started/);
  assert.throws(() => startOffboarding(state, 'EMP-1001', '2026-11-01', 'IT'), /Only HR/);
  const next = startOffboarding(state, 'EMP-1001', '2026-11-01', 'HR');
  const employee = find(next, 'EMP-1001');
  assert.equal(employee.journey, 'offboarding');
  assert.equal(employee.date, '2026-11-01');
  assert.equal(employee.tasks.length, 6);
  assert.equal(employee.assets.length, 2);
  assert.equal(
    employee.tasks.some((task) => task.kind === 'asset-return'),
    true,
  );
  assert.equal(next.activity.length, state.activity.length + 1);
  assert.equal(find(state, 'EMP-1001').journey, 'active');
});

test('notes are trimmed, attributable, immutable, and length-limited', () => {
  const state = fresh();
  const next = addNote(state, 'EMP-1042', '  Delivery confirmed.  ', 'IT');
  const note = find(next, 'EMP-1042').notes[0];
  assert.equal(note.text, 'Delivery confirmed.');
  assert.equal(note.actor, 'IT');
  assert.ok(note.at);
  assert.equal(find(next, 'EMP-1042').notes.length, find(state, 'EMP-1042').notes.length + 1);
  assert.throws(() => addNote(state, 'EMP-1042', ' ', 'HR'), /required/);
  assert.throws(() => addNote(state, 'EMP-1042', 'x'.repeat(1001), 'HR'), /1000/);
  assert.throws(() => addNote(state, 'EMP-1042', 'Hello', 'Admin'), /Choose HR/);
});

test('unknown records and invalid asset operations produce useful errors', () => {
  assert.throws(() => toggleTask(fresh(), 'missing', 'task', 'HR'), /employee could not be found/);
  assert.throws(() => toggleTask(fresh(), 'EMP-1042', 'missing', 'HR'), /task could not be found/);
  assert.throws(
    () => setAssetReturned(fresh(), 'EMP-1021', 'missing', true, 'IT'),
    /asset could not be found/,
  );
  assert.throws(
    () => setAssetReturned(fresh(), 'EMP-1001', 'missing', true, 'IT'),
    /during offboarding/,
  );
  assert.throws(() => setAssetReturned(fresh(), 'EMP-1021', 'missing', 'yes', 'IT'), /whether/);
});

test('persistence round-trips all seed data and mutations', () => {
  const storage = memoryStorage();
  assert.equal(loadState(storage).warning, null);
  const state = addNote(fresh(), 'EMP-1042', 'Saved coordination note.', 'HR');
  assert.deepEqual(saveState(state, storage), { ok: true, warning: null });
  assert.deepEqual(loadState(storage), { state, warning: null });
});

test('malformed and unsupported saved data fall back without overwriting the original', () => {
  for (const saved of [
    '{broken',
    JSON.stringify({ schemaVersion: 99 }),
    JSON.stringify({ ...fresh(), employees: [{}] }),
  ]) {
    const storage = memoryStorage(saved);
    const result = loadState(storage);
    assert.equal(result.state.employees.length, 14);
    assert.match(result.warning, /kept/);
    assert.equal(storage.read(), saved);
  }
});

test('invalid dependencies and duplicate persisted records are detected', () => {
  const duplicate = fresh();
  duplicate.employees.push(structuredClone(duplicate.employees[0]));
  const dependency = fresh();
  dependency.employees[0].tasks[0].dependsOn = ['missing-task'];
  const cycle = fresh();
  cycle.employees[0].tasks[0].dependsOn = [cycle.employees[0].tasks[1].id];
  for (const state of [duplicate, dependency, cycle])
    assert.ok(loadState(memoryStorage(JSON.stringify(state))).warning);
});

test('unavailable or full browser storage does not throw or pretend to save', () => {
  assert.match(loadState(null).warning, /could not be loaded/);
  const denied = {
    getItem() {
      throw new Error('Access denied');
    },
    setItem() {
      throw new Error('Quota exceeded');
    },
  };
  assert.equal(loadState(denied).state.employees.length, 14);
  assert.equal(saveState(fresh(), denied).ok, false);
  assert.match(saveState(fresh(), denied).warning, /could not be saved/);
  assert.equal(saveState({ schemaVersion: 99 }, memoryStorage()).ok, false);
});
