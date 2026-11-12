import { Link } from 'react-router';
import { getProgress, getJourneyStatus, getTaskState, canCompleteTask } from '../domain.js';
import { usePeopleFlow } from '../state/PeopleFlowProvider.jsx';
import { Icon } from './Icon.jsx';
import { dateLabel, relativeDate, timeAgo } from '../utils/format.js';

const COLORS = ['#e9dbf1', '#f4dccb', '#d7e9df', '#dee4f3', '#eee9c9', '#f2dce3'];

export function Avatar({ person, size = '' }) {
  const name = person?.name || '?';
  const color =
    COLORS[[...name].reduce((sum, char) => sum + char.charCodeAt(0), 0) % COLORS.length];
  return (
    <span className={`avatar ${size}`} style={{ '--avatar-bg': color }} aria-hidden="true">
      {name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((word) => word[0])
        .join('')}
    </span>
  );
}
export function Badge({ children, tone = 'neutral' }) {
  return (
    <span className={`badge badge-${tone}`}>
      <span className="status-dot" />
      {children}
    </span>
  );
}
export function JourneyBadge({ person }) {
  const labels = {
    onboarding: 'Onboarding',
    offboarding: 'Offboarding',
    active: 'Active',
    departed: 'Departed',
  };
  return (
    <Badge
      tone={
        person.journey === 'onboarding'
          ? 'green'
          : person.journey === 'offboarding'
            ? 'amber'
            : 'neutral'
      }
    >
      {labels[person.journey]}
    </Badge>
  );
}
export function StatusBadge({ person }) {
  const status = getJourneyStatus(person);
  return (
    <Badge tone={status === 'at-risk' ? 'red' : 'green'}>
      {status === 'at-risk'
        ? 'Needs attention'
        : status === 'complete'
          ? 'Ready to finish'
          : status === 'active'
            ? 'Active'
            : 'On track'}
    </Badge>
  );
}
export function Progress({ person }) {
  const progress = getProgress(person);
  return (
    <div className="progress-cell">
      <div
        className="progress-track"
        role="progressbar"
        aria-label={`${person.name} checklist completion`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress.percent}
      >
        <span className="progress-fill" style={{ width: `${progress.percent}%` }} />
      </div>
      <span>
        {progress.completed}/{progress.total}
      </span>
    </div>
  );
}
export function PersonCell({ person }) {
  return (
    <Link className="person-cell" to={`/people/${encodeURIComponent(person.id)}`}>
      <Avatar person={person} />
      <span>
        <span className="person-name">{person.name}</span>{' '}
        <span className="person-subtitle">{person.title}</span>
      </span>
    </Link>
  );
}
export function PageHeading({ eyebrow, title, description, children }) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="page-title" tabIndex={-1}>
          {title}
        </h1>
        <p className="page-description">{description}</p>
      </div>
      {children && <div className="heading-actions">{children}</div>}
    </div>
  );
}
export function EmptyState({ title, description, children }) {
  return (
    <div className="empty-state">
      <Icon name="leaf" />
      <h3>{title}</h3>
      <p>{description}</p>
      {children}
    </div>
  );
}

export function EmployeeTable({ people, showProgress = true }) {
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th scope="col">Employee</th>
            <th scope="col">Journey</th>
            <th scope="col">{showProgress ? 'Progress' : 'Department'}</th>
            <th scope="col">{showProgress ? 'Milestone' : 'Location'}</th>
            <th scope="col">
              <span className="sr-only">Open employee</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {people.map((person) => (
            <tr key={person.id}>
              <td>
                <PersonCell person={person} />
              </td>
              <td>
                <JourneyBadge person={person} />
              </td>
              <td>{showProgress ? <Progress person={person} /> : person.department}</td>
              <td>
                {showProgress ? (
                  <>
                    <span className="deadline">{dateLabel(person.date)}</span>
                    <span className="person-subtitle">
                      {person.journey === 'offboarding' ? 'Last day' : 'Joining date'}
                    </span>
                  </>
                ) : (
                  person.location
                )}
              </td>
              <td>
                <Link
                  className="journey-link"
                  to={`/people/${encodeURIComponent(person.id)}`}
                  aria-label={`${showProgress ? 'Open' : 'Profile'} for ${person.name}`}
                >
                  {showProgress ? 'Open' : 'Profile'} <Icon name="arrow" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ActivityList({ events, compact = false }) {
  if (!events.length)
    return (
      <EmptyState
        title="The story starts here"
        description="Changes will appear here as your team works."
      />
    );
  return (
    <div className="activity-list">
      {events.map((event) => (
        <div className="activity-item" key={event.id}>
          <span
            className={`activity-dot ${event.actor === 'IT' ? 'dot-amber' : event.actor === 'Manager' ? 'dot-purple' : ''}`}
          />
          <div className="activity-copy">
            <Link to={`/people/${encodeURIComponent(event.employeeId)}`}>
              <strong>{event.employeeName}</strong>
            </Link>
            <p>{event.message}</p>
            <span className="activity-time">
              {event.actor} ·{' '}
              <time dateTime={event.at} title={new Date(event.at).toLocaleString()}>
                {timeAgo(event.at)}
              </time>
            </span>
          </div>
          {!compact && (
            <Badge tone={event.actor === 'HR' ? 'green' : event.actor === 'IT' ? 'amber' : 'blue'}>
              {event.actor}
            </Badge>
          )}
        </div>
      ))}
    </div>
  );
}

export function TaskRow({ person, task, showPerson = false }) {
  const { state, actions, perform } = usePeopleFlow();
  const status = getTaskState(person, task);
  const permission = canCompleteTask(person, task, state.role);
  const missing = task.dependsOn
    .map((id) => person.tasks.find((candidate) => candidate.id === id))
    .filter((candidate) => candidate && !candidate.completed);
  const closed = !['onboarding', 'offboarding'].includes(person.journey);
  const label =
    closed && !task.completed
      ? 'Not completed'
      : status === 'pending'
        ? 'To do'
        : status === 'completed'
          ? 'Done'
          : status === 'overdue'
            ? 'Overdue'
            : 'Blocked';
  const helper = missing.length
    ? `Waiting for: ${missing.map((item) => item.title).join(', ')}`
    : status === 'blocked' && task.kind === 'asset-return'
      ? 'Equipment is still outstanding. IT can record returns in this profile.'
      : status === 'blocked' && task.kind === 'asset-assignment'
        ? 'Assign equipment in this profile before completing this task.'
        : !permission.allowed && !closed
          ? permission.reason
          : '';
  return (
    <div className={`task-row is-${status}`}>
      <button
        type="button"
        className={`task-check ${task.completed ? 'checked' : ''}`}
        aria-label={`${task.completed ? 'Reopen' : 'Complete'} ${task.title}`}
        aria-pressed={task.completed}
        disabled={!permission.allowed}
        title={permission.reason || 'Update task'}
        onClick={() => perform(() => actions.toggleTask(person.id, task.id))}
      >
        {task.completed ? (
          <Icon name="check" />
        ) : status === 'blocked' ? (
          <Icon name="lock" />
        ) : null}
      </button>
      <div className="task-content">
        <span className="task-title">
          {task.title}
          {!task.required && <span className="optional-label">Optional</span>}
        </span>
        <div className="task-meta">
          {showPerson && (
            <>
              <Link to={`/people/${encodeURIComponent(person.id)}`}>{person.name}</Link>
              <span>·</span>
            </>
          )}
          <span className="owner-tag">{task.owner}</span>
          <span>·</span>
          <span className={status === 'overdue' ? 'text-danger' : ''}>
            {task.completed
              ? 'Completed'
              : closed
                ? 'Closed journey'
                : `Due ${relativeDate(task.due)}`}
          </span>
        </div>
        {helper && (
          <p className="task-dependency">
            {status === 'blocked' && <Icon name="lock" />}
            {helper}
          </p>
        )}
      </div>
      <div className="task-actions">
        <Badge
          tone={
            status === 'completed'
              ? 'green'
              : status === 'overdue'
                ? 'red'
                : status === 'blocked' || closed
                  ? 'neutral'
                  : 'blue'
          }
        >
          {label}
        </Badge>
        {showPerson && (
          <Link
            className="journey-link"
            to={`/people/${encodeURIComponent(person.id)}`}
            aria-label={`Open journey for ${person.name}`}
          >
            Open <Icon name="arrow" />
          </Link>
        )}
      </div>
    </div>
  );
}
