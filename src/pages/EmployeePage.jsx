import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { getJourneyStatus, getProgress } from '../domain.js';
import { usePeopleFlow } from '../state/PeopleFlowProvider.jsx';
import {
  ActivityList,
  Avatar,
  Badge,
  EmptyState,
  JourneyBadge,
  PageHeading,
  TaskRow,
} from '../components/Common.jsx';
import { Icon } from '../components/Icon.jsx';
import { dateLabel, timeAgo } from '../utils/format.js';

export function EmployeePage() {
  const { employeeId } = useParams();
  const { state } = usePeopleFlow();
  const person = state.employees.find((employee) => employee.id === employeeId);
  if (!person)
    return (
      <>
        <PageHeading
          eyebrow="EMPLOYEE PROFILE"
          title="This person isn’t here."
          description="The profile may have been removed by a demo reset."
        />
        <Link to="/people" className="btn btn-primary">
          Back to people
        </Link>
      </>
    );
  return <EmployeeProfile key={person.id} person={person} />;
}

function EmployeeProfile({ person }) {
  const { state, actions, perform, openDialog } = usePeopleFlow();
  const [tab, setTab] = useState('checklist');
  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState('');
  const isOpen = ['onboarding', 'offboarding'].includes(person.journey);
  const ready = getJourneyStatus(person) === 'complete';
  const progress = getProgress(person);
  const isExit = ['offboarding', 'departed'].includes(person.journey);
  const events = state.activity.filter((event) => event.employeeId === person.id);

  function submitNote(event) {
    event.preventDefault();
    setNoteError('');
    try {
      actions.addNote(person.id, note);
      setNote('');
    } catch (error) {
      setNoteError(error.message);
    }
  }

  return (
    <>
      <Link className="back-link" to={isOpen ? '/journeys' : '/people'}>
        ← Back to {isOpen ? 'journeys' : 'people'}
      </Link>
      <div className="detail-header">
        <div className="detail-person">
          <Avatar person={person} size="avatar-lg" />
          <div>
            <div className="detail-title-line">
              <h1 className="page-title" tabIndex={-1}>
                {person.name}
              </h1>
              <JourneyBadge person={person} />
            </div>
            <p>
              {person.title} <span>·</span> {person.department}
            </p>
          </div>
        </div>
        <div className="detail-actions">
          {isOpen ? (
            <button
              type="button"
              className="btn btn-primary"
              disabled={state.role !== 'HR'}
              title={
                state.role !== 'HR' ? 'Switch the demo role to HR to close this journey' : undefined
              }
              onClick={() => perform(() => actions.completeJourney(person.id))}
            >
              <Icon name="check" />
              {person.journey === 'offboarding' ? 'Complete exit' : 'Complete onboarding'}
            </button>
          ) : person.journey === 'active' ? (
            <button
              type="button"
              className="btn btn-secondary"
              disabled={state.role !== 'HR'}
              title={state.role !== 'HR' ? 'Switch the demo role to HR' : undefined}
              onClick={() => openDialog('offboarding', { employeeId: person.id })}
            >
              <Icon name="journey" />
              Start offboarding
            </button>
          ) : null}
        </div>
      </div>
      {isOpen && (
        <div className={`lifecycle-banner ${ready ? 'completion-banner' : ''}`}>
          <span>
            <Icon name={ready ? 'check' : 'journey'} />
            {ready
              ? 'All required steps are complete. HR can close this journey.'
              : `${person.journey === 'onboarding' ? 'A considered welcome' : 'A thoughtful farewell'}, one step at a time.`}
          </span>
          <strong>
            {progress.completed}/{progress.total} tasks complete
          </strong>
        </div>
      )}

      <div className="detail-layout">
        <section className="panel">
          <div className="tabs detail-tabs" role="group" aria-label="Profile section">
            {[
              ['checklist', 'Checklist'],
              ['notes', `Notes (${person.notes.length})`],
              ['history', 'Activity'],
            ].map(([value, label]) => (
              <button
                type="button"
                key={value}
                className={`tab ${tab === value ? 'active' : ''}`}
                aria-pressed={tab === value}
                onClick={() => setTab(value)}
              >
                {label}
              </button>
            ))}
          </div>
          {tab === 'checklist' && (
            <>
              <div className="panel-header">
                <div>
                  <h2 className="panel-title">{isExit ? 'Offboarding' : 'Onboarding'} checklist</h2>
                  <p className="panel-subtitle">
                    {isOpen
                      ? 'Tasks unlock as prerequisites are completed.'
                      : 'Closed journey. Required work is complete; optional steps may remain.'}
                  </p>
                </div>
                <span className="count-label">{progress.percent}%</span>
              </div>
              <div className="task-list">
                {person.tasks.map((task) => (
                  <TaskRow key={task.id} person={person} task={task} />
                ))}
              </div>
            </>
          )}
          {tab === 'notes' && (
            <div className="panel-body">
              {person.journey !== 'departed' && (
                <form onSubmit={submitNote}>
                  {noteError && (
                    <p className="form-error" role="alert">
                      {noteError}
                    </p>
                  )}
                  <label className="form-field" htmlFor={`note-${person.id}`}>
                    Add a coordination note
                    <textarea
                      id={`note-${person.id}`}
                      name="note"
                      required
                      maxLength={1000}
                      rows={3}
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                      placeholder="Share context with the next person…"
                      aria-describedby={`note-hint-${person.id}`}
                    />
                  </label>
                  <div className="note-form-footer">
                    <span className="form-hint" id={`note-hint-${person.id}`}>
                      Visible across demo roles. Up to 1,000 characters.
                    </span>
                    <button className="btn btn-primary" type="submit">
                      Add note <Icon name="plus" />
                    </button>
                  </div>
                </form>
              )}
              <div className="notes-list">
                {person.notes.length ? (
                  person.notes.map((item) => (
                    <article className="note" key={item.id}>
                      <div>
                        <strong>{item.actor}</strong>
                        <time dateTime={item.at}>{timeAgo(item.at)}</time>
                      </div>
                      <p>{item.text}</p>
                    </article>
                  ))
                ) : (
                  <EmptyState
                    title="A little context goes a long way"
                    description="Add a handover note for your team."
                  />
                )}
              </div>
            </div>
          )}
          {tab === 'history' && (
            <div className="panel-body">
              <ActivityList events={events} />
            </div>
          )}
        </section>
        <aside>
          <section className="panel detail-summary">
            <div className="panel-header">
              <h2 className="panel-title">The essentials</h2>
              <Icon name="people" />
            </div>
            <div className="panel-body">
              <dl className="info-list">
                <dt>Employee ID</dt>
                <dd>{person.id}</dd>
                <dt>Work email</dt>
                <dd>{person.email}</dd>
                <dt>Department</dt>
                <dd>{person.department}</dd>
                <dt>Manager</dt>
                <dd>{person.manager}</dd>
                <dt>Location</dt>
                <dd>{person.location}</dd>
                <dt>{isExit ? 'Exit date' : 'Joining date'}</dt>
                <dd>{dateLabel(person.date, { year: 'numeric' })}</dd>
              </dl>
            </div>
          </section>
          <section className="panel asset-panel">
            <div className="panel-header">
              <div>
                <h2 className="panel-title">Assigned equipment</h2>
                <p className="panel-subtitle">
                  {person.assets.length} {person.assets.length === 1 ? 'item' : 'items'} on record
                </p>
              </div>
              <Icon name="laptop" />
            </div>
            <div className="panel-body">
              {person.assets.length ? (
                person.assets.map((asset) => (
                  <div className="asset-row" key={asset.id}>
                    <span className="asset-icon">
                      <Icon name="laptop" />
                    </span>
                    <div>
                      <strong>{asset.name}</strong>
                      <span className="person-subtitle">{asset.serial}</span>
                      {isExit && (
                        <Badge tone={asset.returned ? 'green' : 'amber'}>
                          {asset.returned ? 'Returned' : 'Outstanding'}
                        </Badge>
                      )}
                    </div>
                    {person.journey === 'offboarding' && (
                      <label
                        className="asset-toggle"
                        title={
                          state.role === 'IT'
                            ? 'Record equipment return'
                            : 'Switch the demo role to IT to record a return'
                        }
                      >
                        <input
                          type="checkbox"
                          aria-label={`${asset.name} returned`}
                          checked={asset.returned}
                          disabled={state.role !== 'IT'}
                          onChange={(event) =>
                            perform(() =>
                              actions.setAssetReturned(person.id, asset.id, event.target.checked),
                            )
                          }
                        />
                        <span className="sr-only">{asset.name} returned</span>
                      </label>
                    )}
                  </div>
                ))
              ) : (
                <p className="muted text-small">No equipment assigned in this demo record.</p>
              )}
              {person.journey === 'offboarding' && (
                <p className="form-hint">
                  IT records returns here. All equipment must be returned before the exit can close.
                </p>
              )}
              {['onboarding', 'active'].includes(person.journey) && (
                <div style={{ marginTop: 16 }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={state.role !== 'IT'}
                    title={
                      state.role !== 'IT'
                        ? 'Switch the demo role to IT to assign equipment'
                        : undefined
                    }
                    onClick={() => openDialog('asset', { employeeId: person.id })}
                  >
                    <Icon name="plus" />
                    Assign equipment
                  </button>
                </div>
              )}
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}
