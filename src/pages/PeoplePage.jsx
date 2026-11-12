import { useSearchParams } from 'react-router';
import { usePeopleFlow } from '../state/PeopleFlowProvider.jsx';
import { DEPARTMENTS } from '../seed.js';
import { Icon } from '../components/Icon.jsx';
import { PageHeading, EmptyState, EmployeeTable } from '../components/Common.jsx';

export function PeoplePage() {
  const { state, actions, openDialog } = usePeopleFlow();
  const [params, setParams] = useSearchParams();
  const query = params.get('q') || '';
  const department = params.get('department') || '';
  const status = params.get('status') || '';
  const sort = params.get('sort') || 'name';
  const updateFilter = (key, value) =>
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        if (value) next.set(key, value);
        else next.delete(key);
        next.delete('page');
        return next;
      },
      { replace: true },
    );
  const normalized = query.trim().toLowerCase();
  const matches = state.employees
    .filter(
      (person) =>
        (!normalized ||
          `${person.name} ${person.title} ${person.id} ${person.email}`
            .toLowerCase()
            .includes(normalized)) &&
        (!department || person.department === department) &&
        (!status || person.journey === status),
    )
    .sort((a, b) =>
      sort === 'date' ? a.date.localeCompare(b.date) : a.name.localeCompare(b.name),
    );
  const count = matches.length;
  const pages = Math.max(1, Math.ceil(count / 8));
  const requested = Number.parseInt(params.get('page') || '1', 10);
  const page = Math.min(Math.max(Number.isFinite(requested) ? requested : 1, 1), pages);
  const visible = matches.slice((page - 1) * 8, page * 8);
  const setPage = (value) =>
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      if (value <= 1) next.delete('page');
      else next.set('page', String(value));
      return next;
    });
  const filtered = Boolean(query || department || status);

  return (
    <>
      <PageHeading
        eyebrow="THE PEOPLE BEHIND THE WORK"
        title="A place for everyone."
        description="The right details, ready when you need them."
      >
        <button className="btn btn-secondary" onClick={() => actions.exportCSV()}>
          <Icon name="download" />
          Export directory
        </button>
        <button className="btn btn-primary" onClick={() => openDialog('employee')}>
          <Icon name="plus" />
          Add employee
        </button>
      </PageHeading>
      <section className="panel" aria-label="Employee directory">
        <div className="filters-bar">
          <label className="search-field">
            <Icon name="search" />
            <span className="sr-only">Search employees</span>
            <input
              id="people-search"
              type="search"
              aria-label="Search employees"
              placeholder="Search by name, role, or ID…"
              value={query}
              onChange={(event) => updateFilter('q', event.target.value)}
            />
          </label>
          <label>
            <span className="sr-only">Filter department</span>
            <select
              aria-label="Filter department"
              value={department}
              onChange={(event) => updateFilter('department', event.target.value)}
            >
              <option value="">All departments</option>
              {DEPARTMENTS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Filter employee status</span>
            <select
              aria-label="Filter employee status"
              value={status}
              onChange={(event) => updateFilter('status', event.target.value)}
            >
              <option value="">All statuses</option>
              <option value="onboarding">Onboarding</option>
              <option value="offboarding">Offboarding</option>
              <option value="active">Active</option>
              <option value="departed">Departed</option>
            </select>
          </label>
          <label>
            <span className="sr-only">Sort employees</span>
            <select
              aria-label="Sort employees"
              value={sort}
              onChange={(event) => updateFilter('sort', event.target.value)}
            >
              <option value="name">Name: A–Z</option>
              <option value="date">Milestone date</option>
            </select>
          </label>
        </div>
        <div className="filter-count" aria-live="polite">
          {count} {count === 1 ? 'person' : 'people'}
          {filtered ? ' found' : ' in your workspace'}
          {filtered && (
            <button className="text-button" onClick={() => setParams({})}>
              Clear filters
            </button>
          )}
        </div>
        {visible.length ? (
          <EmployeeTable people={visible} showProgress={false} />
        ) : (
          <EmptyState
            title="No people found"
            description="Try a different name, department, or status."
          >
            <button className="btn btn-secondary" onClick={() => setParams({})}>
              Clear filters
            </button>
          </EmptyState>
        )}
        <div className="pagination">
          <span>
            {count ? `${(page - 1) * 8 + 1}–${Math.min(page * 8, count)} of ${count}` : '0 results'}
          </span>
          <div>
            <button
              className="btn btn-secondary"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </button>
            <span>
              Page {page} of {pages}
            </span>
            <button
              className="btn btn-secondary"
              disabled={page >= pages}
              onClick={() => setPage(page + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
