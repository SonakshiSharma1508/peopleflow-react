import { addDays } from './domain.js';
import { createSeed } from './seed.js';

export const STORAGE_KEY = 'peopleflow.react.v2';
const ROLES = ['HR', 'IT', 'Manager'];
const JOURNEYS = ['onboarding', 'offboarding', 'active', 'departed'];
const isText = (value) => typeof value === 'string' && value.trim().length > 0;
const isTimestamp = (value) => typeof value === 'string' && Number.isFinite(Date.parse(value));
const isDate = (value) => {
  try {
    return addDays(value, 0) === value;
  } catch {
    return false;
  }
};

/** Validate the persisted schema before the interface trusts any imported state. */
function validate(state) {
  if (!state || state.schemaVersion !== 1)
    throw new Error('This saved demo uses an unsupported data version.');
  if (
    !Array.isArray(state.employees) ||
    !Array.isArray(state.activity) ||
    !ROLES.includes(state.role)
  )
    throw new Error('The saved demo has an invalid structure.');
  const employeeIds = new Set();
  const emails = new Set();
  for (const employee of state.employees) {
    if (
      !employee ||
      !['id', 'name', 'title', 'department', 'location', 'email', 'manager'].every((key) =>
        isText(employee[key]),
      ) ||
      !isDate(employee.date) ||
      !JOURNEYS.includes(employee.journey)
    )
      throw new Error('A saved employee record is incomplete.');
    const normalizedId = employee.id.toUpperCase();
    const normalizedEmail = employee.email.toLowerCase();
    if (employeeIds.has(normalizedId) || emails.has(normalizedEmail))
      throw new Error('The saved demo contains duplicate employee records.');
    employeeIds.add(normalizedId);
    emails.add(normalizedEmail);
    if (
      !Array.isArray(employee.tasks) ||
      !Array.isArray(employee.assets) ||
      !Array.isArray(employee.notes)
    )
      throw new Error('A saved checklist is invalid.');
    const taskIds = new Set();
    for (const task of employee.tasks) {
      if (
        !task ||
        !isText(task.id) ||
        !isText(task.title) ||
        !ROLES.includes(task.owner) ||
        !isDate(task.due) ||
        typeof task.required !== 'boolean' ||
        typeof task.completed !== 'boolean' ||
        !Array.isArray(task.dependsOn) ||
        !task.dependsOn.every(isText) ||
        (task.completedAt !== null && !isTimestamp(task.completedAt)) ||
        taskIds.has(task.id)
      )
        throw new Error('A saved task is invalid.');
      taskIds.add(task.id);
    }
    for (const task of employee.tasks)
      if (task.dependsOn.some((id) => !taskIds.has(id) || id === task.id))
        throw new Error('A saved task dependency is invalid.');
    const visited = new Set();
    const visiting = new Set();
    function checkCycle(task) {
      if (visiting.has(task.id)) throw new Error('The saved checklist has circular dependencies.');
      if (visited.has(task.id)) return;
      visiting.add(task.id);
      task.dependsOn.forEach((id) =>
        checkCycle(employee.tasks.find((candidate) => candidate.id === id)),
      );
      visiting.delete(task.id);
      visited.add(task.id);
    }
    employee.tasks.forEach(checkCycle);
    const assetIds = new Set();
    for (const asset of employee.assets) {
      if (
        !asset ||
        !['id', 'name', 'serial'].every((key) => isText(asset[key])) ||
        typeof asset.returned !== 'boolean' ||
        assetIds.has(asset.id)
      )
        throw new Error('A saved asset is invalid.');
      assetIds.add(asset.id);
    }
    for (const note of employee.notes)
      if (
        !note ||
        !isText(note.id) ||
        !isText(note.text) ||
        !ROLES.includes(note.actor) ||
        !isTimestamp(note.at)
      )
        throw new Error('A saved note is invalid.');
  }
  for (const event of state.activity)
    if (
      !event ||
      !['id', 'employeeId', 'employeeName', 'message'].every((key) => isText(event[key])) ||
      !ROLES.includes(event.actor) ||
      !isTimestamp(event.at)
    )
      throw new Error('A saved activity event is invalid.');
  return state;
}

export function loadState(storage) {
  try {
    const target = storage === undefined ? globalThis.localStorage : storage;
    if (!target || typeof target.getItem !== 'function')
      throw new Error('Browser storage is unavailable.');
    const saved = target.getItem(STORAGE_KEY);
    if (saved === null) return { state: createSeed(), warning: null };
    return { state: validate(JSON.parse(saved)), warning: null };
  } catch (error) {
    return {
      state: createSeed(),
      warning: `A fresh demo is shown because saved data could not be loaded. Existing saved data has been kept. ${error instanceof Error ? error.message : 'Browser storage is unavailable.'}`,
    };
  }
}

export function saveState(state, storage) {
  try {
    validate(state);
    const target = storage === undefined ? globalThis.localStorage : storage;
    if (!target || typeof target.setItem !== 'function')
      throw new Error('Browser storage is unavailable.');
    target.setItem(STORAGE_KEY, JSON.stringify(state));
    return { ok: true, warning: null };
  } catch {
    return {
      ok: false,
      warning:
        'Your changes work in this tab but could not be saved. Keep the tab open or export your demo data before leaving.',
    };
  }
}
