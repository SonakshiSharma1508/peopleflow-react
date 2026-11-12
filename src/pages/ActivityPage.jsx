import { useSearchParams } from 'react-router';
import { usePeopleFlow } from '../state/PeopleFlowProvider.jsx';
import { Icon } from '../components/Icon.jsx';
import { PageHeading, EmptyState, ActivityList } from '../components/Common.jsx';

export function ActivityPage() {
  const { state, actions } = usePeopleFlow();
  const [params, setParams] = useSearchParams();
  const query = params.get('q') || '';
  const owner = params.get('owner') || '';
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
  const normalized = query.trim().toLowerCase();
  const events = state.activity.filter(
    (event) =>
      (!owner || event.actor === owner) &&
      (!normalized || `${event.employeeName} ${event.message}`.toLowerCase().includes(normalized)),
  );
  return (
    <>
      <PageHeading
        eyebrow="A SHARED MEMORY"
        title="The work behind the welcome."
        description="A trace of who did what, and when. Demo history keeps the latest 250 changes."
      >
        <button className="btn btn-secondary" onClick={() => actions.exportJSON()}>
          <Icon name="download" />
          Export demo data
        </button>
      </PageHeading>
      <section className="panel" aria-label="Workspace activity">
        <div className="filters-bar">
          <label className="search-field">
            <Icon name="search" />
            <span className="sr-only">Search activity</span>
            <input
              id="activity-search"
              type="search"
              aria-label="Search activity"
              placeholder="Find a person or an update…"
              value={query}
              onChange={(event) => update('q', event.target.value)}
            />
          </label>
          <label>
            <span className="sr-only">Activity by role</span>
            <select
              aria-label="Activity by role"
              value={owner}
              onChange={(event) => update('owner', event.target.value)}
            >
              <option value="">All roles</option>
              <option value="HR">HR</option>
              <option value="IT">IT</option>
              <option value="Manager">Manager</option>
            </select>
          </label>
          {Boolean(query || owner) && (
            <button className="btn btn-ghost" onClick={() => setParams({})}>
              Clear filters
            </button>
          )}
        </div>
        <div className="panel-body timeline">
          {events.length ? (
            <ActivityList events={events} />
          ) : (
            <EmptyState
              title="No updates found"
              description="Try a different search or role filter."
            />
          )}
        </div>
      </section>
    </>
  );
}
