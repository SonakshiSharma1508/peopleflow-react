/** Framework-independent workflow rules. Role checks simulate workflow ownership;
 * a production service must enforce authorization on the server. */
const ROLES = ['HR', 'IT', 'Manager'];
const DAY = 86_400_000;

export function todayISO(date = new Date()) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime()))
    throw new Error('Provide a valid date.');
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function parseDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    throw new Error('Use a valid date in YYYY-MM-DD format.');
  const time = Date.parse(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(time) || new Date(time).toISOString().slice(0, 10) !== value)
    throw new Error('Use a valid calendar date.');
  return time;
}

export function addDays(value, amount) {
  if (!Number.isInteger(amount)) throw new Error('The number of days must be a whole number.');
  return new Date(parseDate(value) + amount * DAY).toISOString().slice(0, 10);
}

export function daysUntil(value, from = todayISO()) {
  return Math.round((parseDate(value) - parseDate(from)) / DAY);
}

export function getProgress(employee) {
  const total = employee.tasks.length;
  const completed = employee.tasks.filter((task) => task.completed).length;
  return { completed, total, percent: total ? Math.round((completed / total) * 100) : 0 };
}

function incompleteDependencies(employee, task) {
  return task.dependsOn.filter(
    (id) => !employee.tasks.some((candidate) => candidate.id === id && candidate.completed),
  );
}

export function getTaskState(employee, task, today = todayISO()) {
  if (task.completed) return 'completed';
  if (
    incompleteDependencies(employee, task).length ||
    (task.kind === 'asset-return' && employee.assets.some((asset) => !asset.returned))
  )
    return 'blocked';
  if (task.kind === 'asset-assignment' && !employee.assets.some((asset) => !asset.returned))
    return 'blocked';
  return daysUntil(task.due, today) < 0 ? 'overdue' : 'pending';
}

export function getJourneyStatus(employee, today = todayISO()) {
  if (employee.journey === 'active') return 'active';
  if (employee.journey === 'departed') return 'complete';
  const required = employee.tasks.filter((task) => task.required);
  if (
    required.length &&
    required.every((task) => task.completed) &&
    (employee.journey !== 'offboarding' || employee.assets.every((asset) => asset.returned))
  )
    return 'complete';
  if (required.some((task) => !task.completed && daysUntil(task.due, today) < 0)) return 'at-risk';
  return 'in-progress';
}

function hasCompletedDependent(employee, taskId) {
  function dependsOn(candidate, target, visited = new Set()) {
    if (visited.has(candidate.id)) return false;
    visited.add(candidate.id);
    return candidate.dependsOn.some(
      (id) =>
        id === target ||
        employee.tasks.some((task) => task.id === id && dependsOn(task, target, visited)),
    );
  }
  return employee.tasks.some(
    (task) => task.completed && task.id !== taskId && dependsOn(task, taskId),
  );
}

export function canCompleteTask(employee, task, role) {
  if (!ROLES.includes(role))
    return { allowed: false, reason: 'Choose HR, IT, or Manager to continue.' };
  if (!['onboarding', 'offboarding'].includes(employee.journey))
    return { allowed: false, reason: 'This journey is closed. Its task history is read-only.' };
  if (task.owner !== role)
    return {
      allowed: false,
      reason: `Only ${task.owner} can update this task. Switch the demo role to ${task.owner}.`,
    };
  if (task.completed) {
    if (hasCompletedDependent(employee, task.id))
      return {
        allowed: false,
        reason: 'Reopen dependent tasks first. A completed task relies on this one.',
      };
    return { allowed: true, reason: '' };
  }
  const missing = incompleteDependencies(employee, task);
  if (missing.length) {
    const names = missing.map(
      (id) => employee.tasks.find((candidate) => candidate.id === id)?.title || id,
    );
    return { allowed: false, reason: `Complete the prerequisite first: ${names.join(', ')}.` };
  }
  if (task.kind === 'asset-return' && employee.assets.some((asset) => !asset.returned))
    return {
      allowed: false,
      reason: 'Record the return of every assigned asset before completing this task.',
    };
  if (task.kind === 'asset-assignment' && !employee.assets.some((asset) => !asset.returned))
    return {
      allowed: false,
      reason: 'Assign at least one piece of equipment before completing this task.',
    };
  return { allowed: true, reason: '' };
}

function clone(state) {
  return typeof structuredClone === 'function'
    ? structuredClone(state)
    : JSON.parse(JSON.stringify(state));
}

function findEmployee(state, id) {
  const employee = state.employees.find((item) => item.id === id);
  if (!employee) throw new Error('That employee could not be found.');
  return employee;
}

function requireHR(role) {
  if (role !== 'HR')
    throw new Error('Only HR can manage employee journeys. Switch the demo role to HR.');
}

function record(state, employee, message, actor) {
  const at = new Date().toISOString();
  state.activity.unshift({
    id:
      globalThis.crypto?.randomUUID?.() ||
      `event-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    employeeId: employee.id,
    employeeName: employee.name,
    message,
    actor,
    at,
  });
  state.activity = state.activity.slice(0, 250);
}

export function toggleTask(state, employeeId, taskId, role) {
  const next = clone(state);
  const employee = findEmployee(next, employeeId);
  const task = employee.tasks.find((item) => item.id === taskId);
  if (!task) throw new Error('That task could not be found.');
  const permission = canCompleteTask(employee, task, role);
  if (!permission.allowed) throw new Error(permission.reason);
  task.completed = !task.completed;
  task.completedAt = task.completed ? new Date().toISOString() : null;
  record(next, employee, `${task.completed ? 'Completed' : 'Reopened'} “${task.title}”`, role);
  return next;
}

export function setAssetReturned(state, employeeId, assetId, returned, role) {
  if (role !== 'IT')
    throw new Error('Only IT can record equipment returns. Switch the demo role to IT.');
  if (typeof returned !== 'boolean') throw new Error('Choose whether the asset has been returned.');
  const next = clone(state);
  const employee = findEmployee(next, employeeId);
  if (employee.journey !== 'offboarding')
    throw new Error('Equipment returns can be updated during offboarding only.');
  const asset = employee.assets.find((item) => item.id === assetId);
  if (!asset) throw new Error('That asset could not be found.');
  if (!returned && employee.tasks.some((task) => task.kind === 'asset-return' && task.completed))
    throw new Error('Reopen the equipment return task before marking equipment as outstanding.');
  if (asset.returned === returned) return state;
  asset.returned = returned;
  record(
    next,
    employee,
    `${returned ? 'Recorded return of' : 'Marked as outstanding:'} ${asset.name} (${asset.serial})`,
    role,
  );
  return next;
}

export function assignAsset(state, employeeId, input, role) {
  if (role !== 'IT') throw new Error('Only IT can assign equipment. Switch the demo role to IT.');
  if (!input || typeof input !== 'object')
    throw new Error('Provide the equipment name and serial number.');
  const name = cleanText(input.name, 'Equipment name', 100);
  const serial = cleanText(input.serial, 'Serial number', 80).toUpperCase();
  const employee = findEmployee(state, employeeId);
  if (!['onboarding', 'active'].includes(employee.journey))
    throw new Error('Equipment can only be assigned to onboarding or active employees.');
  const alreadyAssigned = state.employees.some(
    (candidate) =>
      candidate.journey !== 'departed' &&
      candidate.assets.some(
        (asset) =>
          !asset.returned && asset.serial.trim().replace(/\s+/g, ' ').toUpperCase() === serial,
      ),
  );
  if (alreadyAssigned)
    throw new Error(
      'This serial number is already assigned. Use a unique serial number or record its return first.',
    );
  const next = clone(state);
  const nextEmployee = findEmployee(next, employeeId);
  nextEmployee.assets.push({
    id:
      globalThis.crypto?.randomUUID?.() ||
      `asset-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name,
    serial,
    returned: false,
  });
  record(next, nextEmployee, `Assigned ${name} (${serial})`, role);
  return next;
}

export function completeJourney(state, employeeId, role) {
  requireHR(role);
  const next = clone(state);
  const employee = findEmployee(next, employeeId);
  if (!['onboarding', 'offboarding'].includes(employee.journey))
    throw new Error('This employee has no open journey to complete.');
  if (employee.tasks.some((task) => task.required && !task.completed))
    throw new Error('Complete all required tasks before closing this journey.');
  if (employee.journey === 'offboarding' && employee.assets.some((asset) => !asset.returned))
    throw new Error('Return all assigned assets before closing this exit.');
  const isExit = employee.journey === 'offboarding';
  employee.journey = isExit ? 'departed' : 'active';
  record(
    next,
    employee,
    isExit
      ? 'Closed the offboarding journey; employee departed'
      : 'Completed onboarding; employee is now active',
    role,
  );
  return next;
}

function makeTask(id, title, owner, due, dependsOn = [], required = true, kind) {
  return {
    id,
    title,
    owner,
    due,
    required,
    dependsOn,
    completed: false,
    completedAt: null,
    ...(kind ? { kind } : {}),
  };
}

export function createOnboardingTasks(employeeId, date) {
  const id = (key) => `${employeeId}-${key}`;
  return [
    makeTask(id('documents'), 'Verify employment documents', 'HR', addDays(date, -3)),
    makeTask(id('profile'), 'Set up the employee record', 'HR', addDays(date, -2), [
      id('documents'),
    ]),
    makeTask(id('access'), 'Provision work accounts', 'IT', addDays(date, -1), [id('documents')]),
    makeTask(
      id('equipment'),
      'Prepare laptop and equipment',
      'IT',
      date,
      [id('access')],
      true,
      'asset-assignment',
    ),
    makeTask(id('orientation'), 'Run team orientation', 'Manager', addDays(date, 1), [
      id('profile'),
      id('access'),
    ]),
    makeTask(id('plan'), 'Agree on the first 30-day plan', 'Manager', addDays(date, 3), [
      id('orientation'),
    ]),
    makeTask(id('buddy'), 'Introduce the onboarding buddy', 'Manager', date, [], false),
  ];
}

export function createOffboardingTasks(employeeId, date) {
  const id = (key) => `${employeeId}-exit-${key}`;
  return [
    makeTask(id('confirm'), 'Confirm exit date and checklist', 'HR', addDays(date, -5)),
    makeTask(id('handover'), 'Approve knowledge handover', 'Manager', addDays(date, -2), [
      id('confirm'),
    ]),
    makeTask(
      id('assets'),
      'Confirm equipment returned',
      'IT',
      date,
      [id('confirm')],
      true,
      'asset-return',
    ),
    makeTask(id('access'), 'Revoke work account access', 'IT', date, [id('handover')]),
    makeTask(id('settlement'), 'Record final settlement review', 'HR', addDays(date, 1), [
      id('assets'),
      id('access'),
    ]),
    makeTask(
      id('interview'),
      'Conduct exit interview',
      'HR',
      addDays(date, -1),
      [id('confirm')],
      false,
    ),
  ];
}

function cleanText(value, label, max = 120) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} is required.`);
  const text = value.trim().replace(/\s+/g, ' ');
  if (text.length > max) throw new Error(`${label} must be ${max} characters or fewer.`);
  return text;
}

export function createEmployee(state, input, role) {
  requireHR(role);
  if (!input || typeof input !== 'object') throw new Error('Provide the new employee details.');
  const id = cleanText(input.id, 'Employee ID', 24).toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9-]*$/.test(id))
    throw new Error('Employee ID may contain letters, numbers, and hyphens only.');
  if (state.employees.some((employee) => employee.id.toUpperCase() === id))
    throw new Error('This employee ID already exists. Choose a unique ID.');
  const email = cleanText(input.email, 'Work email', 160).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new Error('Enter a valid work email address.');
  if (state.employees.some((employee) => employee.email.toLowerCase() === email))
    throw new Error('This email address already belongs to an employee.');
  parseDate(input.date);
  const employee = {
    id,
    name: cleanText(input.name, 'Full name', 80),
    title: cleanText(input.title, 'Job title', 100),
    department: cleanText(input.department, 'Department', 60),
    location: cleanText(input.location, 'Location', 80),
    email,
    manager: cleanText(input.manager, 'Manager', 80),
    date: input.date,
    journey: 'onboarding',
    tasks: createOnboardingTasks(id, input.date),
    assets: [],
    notes: [],
  };
  const next = clone(state);
  next.employees.unshift(employee);
  record(next, employee, 'Created an employee profile and onboarding checklist', role);
  return next;
}

export function addNote(state, employeeId, text, role) {
  if (!ROLES.includes(role)) throw new Error('Choose HR, IT, or Manager to add a note.');
  const note = cleanText(text, 'Note', 1000);
  const next = clone(state);
  const employee = findEmployee(next, employeeId);
  if (employee.journey === 'departed')
    throw new Error('This journey is archived. Its notes are read-only.');
  const at = new Date().toISOString();
  employee.notes.unshift({
    id:
      globalThis.crypto?.randomUUID?.() ||
      `note-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    text: note,
    actor: role,
    at,
  });
  record(next, employee, 'Added a coordination note', role);
  return next;
}

export function startOffboarding(state, employeeId, date, role) {
  requireHR(role);
  parseDate(date);
  const next = clone(state);
  const employee = findEmployee(next, employeeId);
  if (employee.journey !== 'active')
    throw new Error('Offboarding can only be started for an active employee.');
  employee.journey = 'offboarding';
  employee.date = date;
  employee.tasks = createOffboardingTasks(employee.id, date);
  employee.assets = employee.assets.map((asset) => ({ ...asset, returned: false }));
  record(next, employee, `Started offboarding with an exit date of ${date}`, role);
  return next;
}
