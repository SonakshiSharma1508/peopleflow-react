import { Link, useSearchParams } from 'react-router';
import { usePeopleFlow } from '../state/PeopleFlowProvider.jsx';
import { getJourneyStatus, getProgress } from '../domain.js';
import { dateLabel } from '../utils/format.js';
import { Icon } from '../components/Icon.jsx';
import {
  Avatar,
  JourneyBadge,
  StatusBadge,
  Progress,
  PageHeading,
  EmptyState,
} from '../components/Common.jsx';

export function JourneysPage() {
  const { state, openDialog } = usePeopleFlow();
  const [params, setParams] = useSearchParams();
  const type = params.get('type') || '';
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
  const all = state.employees.filter((person) =>
    ['onboarding', 'offboarding'].includes(person.journey),
  );
  const people = all.filter(
    (person) =>
      (!type || person.journey === type) && (!status || getJourneyStatus(person) === status),
  );
  return (
    <>
      <PageHeading
        eyebrow="FROM FIRST HELLO TO WHAT’S NEXT"
        title="Every step has a story."
        description="Connected checklists with clear ownership and fewer loose ends."
      >
        <button className="btn btn-primary" onClick={() => openDialog('employee')}>
          <Icon name="plus" />
          Start onboarding
        </button>
      </PageHeading>
      <div className="page-toolbar">
        <div className="segmented-control" role="group" aria-label="Journey type">
          {[
            ['', 'All journeys'],
            ['onboarding', 'Onboarding'],
            ['offboarding', 'Offboarding'],
          ].map(([value, label]) => (
            <button
              key={value}
              className={type === value ? 'active' : ''}
              aria-pressed={type === value}
              onClick={() => update('type', value)}
            >
              {label}
              <span>{all.filter((person) => !value || person.journey === value).length}</span>
            </button>
          ))}
        </div>
        <label>
          <span className="sr-only">Journey health</span>
          <select
            aria-label="Journey health"
            value={status}
            onChange={(event) => update('status', event.target.value)}
          >
            <option value="">All health statuses</option>
            <option value="at-risk">Needs attention</option>
            <option value="in-progress">On track</option>
            <option value="complete">Ready to finish</option>
          </select>
        </label>
      </div>
      {people.length ? (
        <div className="journey-grid">
          {people.map((person) => {
            const progress = getProgress(person);
            return (
              <article className="journey-card" key={person.id}>
                <div className="journey-card-header">
                  <JourneyBadge person={person} />
                  <StatusBadge person={person} />
                </div>
                <div className="journey-card-body">
                  <Avatar person={person} size="avatar-lg" />
                  <h2>
                    <Link to={`/people/${encodeURIComponent(person.id)}`}>{person.name}</Link>
                  </h2>
                  <p>{person.title}</p>
                  <span className="text-small muted">
                    {person.department} · {person.location}
                  </span>
                  <div className="journey-date">
                    <Icon name="calendar" />
                    {person.journey === 'offboarding' ? 'Last day' : 'Joining'}{' '}
                    {dateLabel(person.date)}
                  </div>
                  <div className="journey-progress-label">
                    <span>Journey progress</span>
                    <strong>{progress.percent}%</strong>
                  </div>
                  <Progress person={person} />
                </div>
                <div className="journey-card-footer">
                  <span>{progress.total - progress.completed} tasks remaining</span>
                  <Link
                    className="journey-link"
                    to={`/people/${encodeURIComponent(person.id)}`}
                    aria-label={`Continue journey for ${person.name}`}
                  >
                    Continue
                    <Icon name="arrow" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="No journeys here"
          description="Try another health status or journey type."
        >
          <button className="btn btn-secondary" onClick={() => setParams({})}>
            Clear filters
          </button>
        </EmptyState>
      )}
    </>
  );
}
