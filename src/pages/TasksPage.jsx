import { useSearchParams } from 'react-router';
import { usePeopleFlow } from '../state/PeopleFlowProvider.jsx';
import { daysUntil, getTaskState } from '../domain.js';
import { Icon } from '../components/Icon.jsx';
import { PageHeading, EmptyState, TaskRow } from '../components/Common.jsx';

export function TasksPage() {
  const { state } = usePeopleFlow();
  const [params, setParams] = useSearchParams();
  const query = params.get('q') || '';
  const owner = params.get('owner') || '';
  const status = params.get('status') || '';
  const update = (key, value) =>
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true },
    );
  const all = state.employees
    .filter((person) => ['onboarding', 'offboarding'].includes(person.journey))
    .flatMap((person) =>
      person.tasks.map((task) => ({ person, task, status: getTaskState(person, task) })),
    );
  const overdue = all.filter(({ task }) => !task.completed && daysUntil(task.due) < 0).length;
  const normalized = query.trim().toLowerCase();
  const list = all
    .filter(
      ({ person, task, status: taskStatus }) =>
        (!normalized || `${task.title} ${person.name}`.toLowerCase().includes(normalized)) &&
        (!owner || task.owner === owner) &&
        (!status ||
          (status === 'overdue'
            ? !task.completed && daysUntil(task.due) < 0
            : taskStatus === status)),
    )
    .sort((a, b) => a.task.due.localeCompare(b.task.due));
  const showRoleTasks = () =>
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        next.set('owner', state.role);
        next.delete('status');
        return next;
      },
      { replace: true },
    );
  return (
    <>
      <PageHeading
        eyebrow="LESS CHASING. MORE DOING."
        title="The next right thing."
        description="One queue for every team. Dependencies keep the order honest."
      >
        <button className="btn btn-secondary" onClick={showRoleTasks}>
          <Icon name="tasks" />
          Show {state.role} tasks
        </button>
      </PageHeading>
      <section className="panel" aria-label="Task queue">
        <div className="filters-bar">
          <label className="search-field">
            <Icon name="search" />
            <span className="sr-only">Search tasks</span>
            <input
              id="tasks-search"
              type="search"
              aria-label="Search tasks"
              placeholder="Search tasks or people…"
              value={query}
              onChange={(event) => update('q', event.target.value)}
            />
          </label>
          <label>
            <span className="sr-only">Filter task owner</span>
            <select
              aria-label="Filter task owner"
              value={owner}
              onChange={(event) => update('owner', event.target.value)}
            >
              <option value="">All owners</option>
              <option value="HR">HR</option>
              <option value="IT">IT</option>
              <option value="Manager">Manager</option>
            </select>
          </label>
          <label>
            <span className="sr-only">Filter task status</span>
            <select
              aria-label="Filter task status"
              value={status}
              onChange={(event) => update('status', event.target.value)}
            >
              <option value="">All tasks</option>
              <option value="pending">To do</option>
              <option value="overdue">Overdue (including blocked)</option>
              <option value="blocked">Blocked</option>
              <option value="completed">Completed</option>
            </select>
          </label>
        </div>
        <div className="filter-count" aria-live="polite">
          {list.length} tasks shown · {overdue} past their deadline across open journeys. Blocked
          tasks keep their dependency status.
          {Boolean(query || owner || status) && (
            <button className="text-button" onClick={() => setParams({})}>
              Clear filters
            </button>
          )}
        </div>
        <div className="task-list">
          {list.length ? (
            list.map(({ person, task }) => (
              <TaskRow key={task.id} person={person} task={task} showPerson />
            ))
          ) : (
            <EmptyState title="A little breathing room" description="No tasks match these filters.">
              <button className="btn btn-secondary" onClick={() => setParams({})}>
                Show all tasks
              </button>
            </EmptyState>
          )}
        </div>
      </section>
    </>
  );
}
