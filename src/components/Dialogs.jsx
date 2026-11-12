import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router';
import { usePeopleFlow } from '../state/PeopleFlowProvider.jsx';
import { DEPARTMENTS } from '../seed.js';
import {
  addDays,
  createEmployee,
  createOnboardingTasks,
  daysUntil,
  getTaskState,
  todayISO,
} from '../domain.js';
import { Avatar, EmptyState } from './Common.jsx';
import { Icon } from './Icon.jsx';
import { dateLabel } from '../utils/format.js';

function Modal({ title, description, wide = false, focusKey = '', children }) {
  const { closeDialog } = usePeopleFlow();
  const ref = useRef(null),
    returnFocus = useRef(document.activeElement);
  const titleId = useId(),
    descriptionId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog.open) dialog.showModal();
    const initial = dialog.querySelector('[data-autofocus]') || dialog.querySelector('h2');
    initial?.focus();
  }, [focusKey]);
  useEffect(
    () => () => {
      if (ref.current?.open) ref.current.close();
      const trigger = returnFocus.current;
      if (trigger?.isConnected && !trigger.closest('[inert]'))
        trigger.focus({ preventScroll: true });
      else
        (
          document.querySelector('[aria-label="Open navigation"]') ||
          document.getElementById('main-content')
        )?.focus({ preventScroll: true });
    },
    [],
  );
  return (
    <dialog
      ref={ref}
      className={`modal-dialog ${wide ? 'modal-wide' : ''}`}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        event.preventDefault();
        closeDialog();
      }}
      onClick={(event) => {
        if (event.target !== ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        if (
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom
        )
          closeDialog();
      }}
    >
      <div className="modal-header">
        <div>
          <h2 id={titleId} tabIndex={-1}>
            {title}
          </h2>
          {description && <p id={descriptionId}>{description}</p>}
        </div>
        <button
          type="button"
          className="icon-button"
          aria-label="Close dialog"
          onClick={closeDialog}
        >
          <Icon name="close" />
        </button>
      </div>
      {children}
    </dialog>
  );
}

function FormError({ error }) {
  return error ? (
    <p className="form-error" role="alert">
      {error}
    </p>
  ) : null;
}
function CancelButton() {
  const { closeDialog } = usePeopleFlow();
  return (
    <button type="button" className="btn btn-secondary" onClick={closeDialog}>
      Cancel
    </button>
  );
}

function EmployeeDialog() {
  const { state, actions, closeDialog } = usePeopleFlow();
  const navigate = useNavigate();
  const [step, setStep] = useState(1),
    [error, setError] = useState('');
  const [form, setForm] = useState(() => ({
    name: '',
    email: '',
    title: '',
    manager: '',
    location: '',
    department: DEPARTMENTS[0],
    date: addDays(todayISO(), 7),
    id: `EMP-${Math.max(1048, ...state.employees.map((person) => Number(person.id.replace(/\D/g, '')) || 0)) + 1}`,
  }));
  const change = (event) =>
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  function submit(event) {
    event.preventDefault();
    setError('');
    try {
      if (step === 1) {
        createEmployee(state, form, state.role);
        setStep(2);
      } else {
        const id = actions.createEmployee(form);
        closeDialog();
        navigate(`/people/${encodeURIComponent(id)}`);
      }
    } catch (failure) {
      setError(failure.message);
    }
  }
  const input = (name, label, extra = {}) => (
    <label className="form-field">
      {label}
      <input name={name} value={form[name]} onChange={change} required {...extra} />
    </label>
  );
  return (
    <Modal
      title="A new beginning."
      description="Add a person. We’ll take care of the checklist."
      wide
      focusKey={step}
    >
      <div className="stepper">
        <span className={`step ${step === 1 ? 'active' : 'complete'}`}>
          <b>1</b> Employee details
        </span>
        <span className={`step ${step === 2 ? 'active' : ''}`}>
          <b>2</b> Review journey
        </span>
      </div>
      <form onSubmit={submit}>
        <div className="modal-body">
          <FormError error={error} />
          {step === 1 ? (
            <>
              <div className="form-grid">
                {input('name', 'Full name', {
                  maxLength: 80,
                  'data-autofocus': true,
                  placeholder: 'e.g. Jamie Chen',
                })}
                {input('email', 'Work email', {
                  type: 'email',
                  maxLength: 160,
                  placeholder: 'jamie@example.com',
                })}
                {input('id', 'Employee ID', { maxLength: 24, pattern: '[A-Za-z0-9][A-Za-z0-9-]*' })}
                {input('title', 'Job title', {
                  maxLength: 100,
                  placeholder: 'e.g. Product Designer',
                })}
                <label className="form-field">
                  Department
                  <select
                    aria-label="Department"
                    name="department"
                    value={form.department}
                    onChange={change}
                    required
                  >
                    {DEPARTMENTS.map((department) => (
                      <option key={department}>{department}</option>
                    ))}
                  </select>
                </label>
                {input('manager', 'Manager', { maxLength: 80 })}
                {input('location', 'Location', { maxLength: 80, placeholder: 'e.g. Remote' })}
                {input('date', 'Joining date', {
                  type: 'date',
                  min: '2000-01-01',
                  max: '2100-12-31',
                })}
              </div>
              <p className="form-hint">
                Use fictional details. Every field helps create a useful employee record.
              </p>
            </>
          ) : (
            <>
              <div className="review-person">
                <Avatar person={form} size="avatar-lg" />
                <div>
                  <h3>{form.name}</h3>
                  <p>
                    {form.title} · {form.department}
                  </p>
                  <span>
                    {form.id} · Joining {dateLabel(form.date, { year: 'numeric' })}
                  </span>
                </div>
              </div>
              <h3 className="review-heading">A ready-to-go first week</h3>
              <p className="form-hint">
                7 tasks across HR, IT, and the manager. Deadlines follow the joining date.
              </p>
              <div className="review-tasks">
                {createOnboardingTasks(form.id, form.date).map((task) => (
                  <div key={task.id}>
                    <Icon name="check" />
                    <span>{task.title}</span>
                    <span className="owner-tag">{task.owner}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        <div className="modal-footer">
          {step === 1 ? (
            <CancelButton />
          ) : (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setError('');
                setStep(1);
              }}
            >
              Back
            </button>
          )}
          <button className="btn btn-primary" type="submit">
            {step === 1 ? 'Review journey' : 'Create employee'}
            <Icon name="arrow" />
          </button>
        </div>
      </form>
    </Modal>
  );
}

function AssetDialog({ employeeId }) {
  const { state, actions, closeDialog } = usePeopleFlow();
  const person = state.employees.find((person) => person.id === employeeId);
  const [form, setForm] = useState({ name: '', serial: '' }),
    [error, setError] = useState('');
  return (
    <Modal
      title="The tools for a good start."
      description={`Assign equipment to ${person?.name || 'this employee'}.`}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          try {
            actions.assignAsset(employeeId, form);
            closeDialog();
          } catch (failure) {
            setError(failure.message);
          }
        }}
      >
        <div className="modal-body">
          <FormError error={error} />
          <div className="form-grid">
            <label className="form-field full-width">
              Equipment name
              <input
                data-autofocus
                name="name"
                required
                maxLength={100}
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder="e.g. MacBook Air 13-inch"
              />
            </label>
            <label className="form-field full-width">
              Serial / asset number
              <input
                name="serial"
                required
                maxLength={80}
                value={form.serial}
                onChange={(event) => setForm({ ...form, serial: event.target.value })}
                placeholder="e.g. NS-LAPTOP-042"
              />
            </label>
          </div>
          <p className="form-hint">
            An outstanding serial can only belong to one employee. Equipment must be returned during
            an exit.
          </p>
        </div>
        <div className="modal-footer">
          <CancelButton />
          <button type="submit" className="btn btn-primary">
            Assign equipment <Icon name="plus" />
          </button>
        </div>
      </form>
    </Modal>
  );
}

function OffboardingDialog({ employeeId }) {
  const { state, actions, closeDialog } = usePeopleFlow();
  const person = state.employees.find((person) => person.id === employeeId);
  const [date, setDate] = useState(addDays(todayISO(), 14)),
    [error, setError] = useState('');
  return (
    <Modal
      title="Make the next chapter smoother."
      description={`Start offboarding for ${person?.name || 'this employee'}.`}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          try {
            actions.startOffboarding(employeeId, date);
            closeDialog();
          } catch (failure) {
            setError(failure.message);
          }
        }}
      >
        <div className="modal-body">
          <FormError error={error} />
          <label className="form-field">
            Last working day
            <input
              data-autofocus
              type="date"
              value={date}
              required
              min="2000-01-01"
              max="2100-12-31"
              onChange={(event) => setDate(event.target.value)}
            />
          </label>
          <p className="form-hint">
            Creates 6 exit tasks for handover, equipment, access, and HR review. This replaces the
            current onboarding checklist; recent activity remains.
          </p>
        </div>
        <div className="modal-footer">
          <CancelButton />
          <button type="submit" className="btn btn-primary">
            Start offboarding <Icon name="arrow" />
          </button>
        </div>
      </form>
    </Modal>
  );
}

function GuideDialog() {
  const { closeDialog } = usePeopleFlow();
  const steps = [
    [
      'EMP-1045',
      'Follow a connected welcome',
      'Open Omar’s checklist. HR verifies documents before IT can provision accounts. Switch roles to see ownership in action.',
    ],
    [
      'EMP-1021',
      'Close every loose end',
      'Explore Maya’s exit. IT records equipment returns before the equipment task can be completed.',
    ],
    [
      'EMP-1041',
      'Celebrate a completed beginning',
      'Noah’s required tasks are finished. HR can complete onboarding and see the directory and activity update together.',
    ],
  ];
  return (
    <Modal
      title="A little tour. A lot to explore."
      description="Welcome to Northstar Studio, your fictional people workspace."
      wide
    >
      <div className="modal-body">
        <span className="guide-kicker">YOUR THREE-MINUTE WALKTHROUGH</span>
        <div className="guide-steps">
          {steps.map(([id, title, description], index) => (
            <Link className="guide-step" key={id} to={`/people/${id}`} onClick={closeDialog}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <div>
                <h3>{title}</h3>
                <p>{description}</p>
              </div>
              <Icon name="arrow" />
            </Link>
          ))}
        </div>
        <div className="guide-note">
          <Icon name="leaf" />
          <p>
            Everything here is fictional. Changes stay in this browser. Workspace settings lets you
            restore a fresh demo.
          </p>
        </div>
      </div>
      <div className="modal-footer">
        <span className="form-hint">React + JavaScript · No account needed</span>
        <button type="button" className="btn btn-primary" onClick={closeDialog}>
          Let’s explore <Icon name="arrow" />
        </button>
      </div>
    </Modal>
  );
}

const PAGES = [
  ['/', 'Overview'],
  ['/people', 'People'],
  ['/journeys', 'Journeys'],
  ['/tasks', 'Task queue'],
  ['/activity', 'Activity'],
  ['/templates', 'Templates'],
];
function SearchDialog() {
  const { state, closeDialog } = usePeopleFlow();
  const [query, setQuery] = useState('');
  const normalized = query.toLowerCase().trim();
  const people = state.employees
    .filter((person) =>
      `${person.name} ${person.id} ${person.title}`.toLowerCase().includes(normalized),
    )
    .slice(0, 5);
  const tasks = normalized
    ? state.employees
        .filter((person) => ['onboarding', 'offboarding'].includes(person.journey))
        .flatMap((person) => person.tasks.map((task) => ({ person, task })))
        .filter(({ person, task }) =>
          `${person.name} ${task.title}`.toLowerCase().includes(normalized),
        )
        .slice(0, 4)
    : [];
  const pages = PAGES.filter(([, name]) => name.toLowerCase().includes(normalized));
  return (
    <Modal
      title="Find your next step."
      description="Search people, tasks, and workspace pages."
      wide
    >
      <div className="modal-body">
        <label className="search-field global-search-field">
          <Icon name="search" />
          <span className="sr-only">Search workspace</span>
          <input
            data-autofocus
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="A name, an employee ID, a task…"
          />
        </label>
        <div className="search-results">
          {people.length > 0 && (
            <>
              <p className="nav-label">PEOPLE</p>
              {people.map((person) => (
                <Link
                  className="search-result"
                  to={`/people/${encodeURIComponent(person.id)}`}
                  key={person.id}
                  onClick={closeDialog}
                >
                  <Avatar person={person} />
                  <span>
                    <strong>{person.name}</strong>
                    <small>
                      {person.title} · {person.id}
                    </small>
                  </span>
                  <Icon name="arrow" />
                </Link>
              ))}
            </>
          )}
          {tasks.length > 0 && (
            <>
              <p className="nav-label">TASKS</p>
              {tasks.map(({ person, task }) => (
                <Link
                  className="search-result"
                  to={`/people/${encodeURIComponent(person.id)}`}
                  key={task.id}
                  onClick={closeDialog}
                >
                  <Icon name="tasks" />
                  <span>
                    <strong>{task.title}</strong>
                    <small>
                      {person.name} · {task.owner}
                    </small>
                  </span>
                  <Icon name="arrow" />
                </Link>
              ))}
            </>
          )}
          {pages.length > 0 && (
            <>
              <p className="nav-label">PAGES</p>
              {pages.map(([path, name]) => (
                <Link className="search-result" key={path} to={path} onClick={closeDialog}>
                  <Icon name="grid" />
                  <span>{name}</span>
                  <Icon name="arrow" />
                </Link>
              ))}
            </>
          )}
          {!people.length && !tasks.length && !pages.length && (
            <EmptyState title="No matches yet" description="Try a name, employee ID, or task." />
          )}
        </div>
      </div>
      <div className="modal-footer">
        <span className="form-hint">Press Escape to close · Tab to move through results</span>
      </div>
    </Modal>
  );
}

function NotificationsDialog() {
  const { state, closeDialog } = usePeopleFlow();
  const tasks = state.employees
    .filter((person) => ['onboarding', 'offboarding'].includes(person.journey))
    .flatMap((person) => person.tasks.map((task) => ({ person, task })))
    .filter(({ task }) => !task.completed && daysUntil(task.due) < 0)
    .sort((a, b) => a.task.due.localeCompare(b.task.due));
  return (
    <Modal
      title="A few things need a nudge."
      description={`${tasks.length} unfinished tasks are past their deadline.`}
    >
      <div className="modal-body notification-list">
        {tasks.length ? (
          tasks.map(({ person, task }) => (
            <Link
              className="attention-item"
              key={task.id}
              to={`/people/${encodeURIComponent(person.id)}`}
              onClick={closeDialog}
            >
              <span className="attention-icon">
                <Icon name="clock" />
              </span>
              <span className="attention-copy">
                <strong>{task.title}</strong>
                <span>
                  {person.name} · {task.owner}
                </span>
                <small>
                  {Math.abs(daysUntil(task.due))} days overdue ·{' '}
                  {getTaskState(person, task) === 'blocked'
                    ? 'Waiting on a prerequisite'
                    : 'Ready to action'}
                </small>
              </span>
              <Icon name="chevron" />
            </Link>
          ))
        ) : (
          <EmptyState title="Everything is on time" description="A good moment to take a breath." />
        )}
      </div>
      <div className="modal-footer">
        <Link className="btn btn-primary" to="/tasks?status=overdue" onClick={closeDialog}>
          Open task queue <Icon name="arrow" />
        </Link>
      </div>
    </Modal>
  );
}

function ResetDialog() {
  const { actions, perform, closeDialog } = usePeopleFlow();
  const navigate = useNavigate();
  return (
    <Modal title="A fresh page?" description="Restore the original Northstar Studio React demo.">
      <div className="modal-body">
        <p>
          This replaces employee additions, checklist changes, and notes in this browser’s React
          demo. Other visitors’ demos and the JavaScript v1 data are separate.
        </p>
        <p className="form-hint">
          Export a snapshot first if you want a copy for inspection. This version has no import
          feature.
        </p>
      </div>
      <div className="modal-footer">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => perform(actions.exportJSON)}
        >
          <Icon name="download" />
          Export first
        </button>
        <button type="button" className="btn btn-secondary" onClick={closeDialog}>
          Keep exploring
        </button>
        <button
          type="button"
          className="btn btn-danger"
          onClick={() => {
            actions.resetDemo();
            closeDialog();
            navigate('/');
          }}
        >
          <Icon name="reset" />
          Reset demo
        </button>
      </div>
    </Modal>
  );
}

export function Dialogs() {
  const { dialog } = usePeopleFlow();
  if (!dialog) return null;
  const components = {
    employee: EmployeeDialog,
    asset: AssetDialog,
    offboarding: OffboardingDialog,
    guide: GuideDialog,
    search: SearchDialog,
    notifications: NotificationsDialog,
    reset: ResetDialog,
  };
  const Content = components[dialog.type];
  if (!Content) return null;
  return createPortal(
    <Content key={dialog.type} {...dialog} />,
    document.getElementById('modal-root') || document.body,
  );
}
