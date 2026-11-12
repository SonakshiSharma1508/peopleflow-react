import { useState } from 'react';
import { Link } from 'react-router';
import { daysUntil, getJourneyStatus } from '../domain.js';
import { usePeopleFlow } from '../state/PeopleFlowProvider.jsx';
import { ActivityList, EmployeeTable, EmptyState, PageHeading } from '../components/Common.jsx';
import { Icon } from '../components/Icon.jsx';
import { relativeDate } from '../utils/format.js';

export function OverviewPage() {
  const { state, openDialog } = usePeopleFlow();
  const [tab, setTab] = useState('all');
  const journeys = state.employees.filter((person) =>
    ['onboarding', 'offboarding'].includes(person.journey),
  );
  const onboarding = journeys.filter((person) => person.journey === 'onboarding');
  const exits = journeys.filter((person) => person.journey === 'offboarding');
  const allTasks = journeys.flatMap((person) => person.tasks.map((task) => ({ person, task })));
  const overdue = allTasks.filter(({ task }) => !task.completed && daysUntil(task.due) < 0);
  const ready = journeys.filter((person) => getJourneyStatus(person) === 'complete');
  const shown = journeys
    .filter((person) => tab === 'all' || person.journey === tab)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);
  const attention = [...overdue].sort((a, b) => a.task.due.localeCompare(b.task.due)).slice(0, 3);
  const completed = allTasks.filter(({ task }) => task.completed).length;
  const completion = allTasks.length ? Math.round((completed / allTasks.length) * 100) : 0;
  const stats = [
    {
      icon: 'journey',
      value: onboarding.length,
      label: 'Onboarding',
      detail: 'A thoughtful beginning',
      tone: 'green',
      to: '/journeys?type=onboarding',
    },
    {
      icon: 'briefcase',
      value: exits.length,
      label: 'Offboarding',
      detail: 'Every detail accounted for',
      tone: 'amber',
      to: '/journeys?type=offboarding',
    },
    {
      icon: 'clock',
      value: overdue.length,
      label: 'Overdue tasks',
      detail: 'A little attention needed',
      tone: 'red',
      to: '/tasks?status=overdue',
    },
    {
      icon: 'check',
      value: ready.length,
      label: 'Ready to finish',
      detail: 'The last step is yours',
      tone: 'blue',
      to: '/journeys?status=complete',
    },
  ];

  return (
    <>
      <PageHeading
        eyebrow="WORKSPACE OVERVIEW"
        title="Your people. Moving forward."
        description="A little clarity for every hello, handover, and next chapter."
      >
        <button type="button" className="btn btn-secondary" onClick={() => openDialog('guide')}>
          <Icon name="help" />
          Take a tour
        </button>
        <button type="button" className="btn btn-primary" onClick={() => openDialog('employee')}>
          <Icon name="plus" />
          Add employee
        </button>
      </PageHeading>

      <section className="hero-grid" aria-label="Workspace highlights">
        <div className="hero-card">
          <div className="hero-copy">
            <span className="hero-tag">
              <span className="status-dot" />
              PEOPLE FIRST. ALWAYS.
            </span>
            <h2>
              Great journeys start
              <br />
              with the little things.
            </h2>
            <p>
              {journeys.length} employee journeys in motion.
              <br />
              Let’s make every step feel considered.
            </p>
            <Link to="/journeys" className="btn btn-light">
              Explore journeys <Icon name="arrow" />
            </Link>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="orbit orbit-three" />
            <span className="art-leaf leaf-one" />
            <span className="art-leaf leaf-two" />
            <span className="art-leaf leaf-three" />
            <span className="orbit-label">
              <Icon name="spark" />A better beginning
            </span>
            <span className="art-dot" />
          </div>
          <div className="hero-bottom">A shared workspace. A smoother experience.</div>
        </div>
        <div className="pulse-card">
          <div className="pulse-header">
            <span className="eyebrow">JOURNEY PULSE</span>
            <Icon name="leaf" />
          </div>
          <div className="pulse-value">
            {completion}
            <span>%</span>
          </div>
          <p>of open journey tasks completed</p>
          <div className="pulse-bars" aria-hidden="true">
            {Array.from({ length: 24 }, (_, index) => (
              <span
                key={index}
                className={`pulse-bar ${index < Math.round((completion / 100) * 24) ? 'filled' : ''}`}
                style={{ height: `${24 + (index % 6) * 6}px` }}
              />
            ))}
          </div>
          <div className="pulse-footer">
            <span className="status-dot" />
            {completed} of {allTasks.length} tasks taken care of
          </div>
        </div>
      </section>

      <section className="stats-grid" aria-label="Journey metrics">
        {stats.map((stat) => (
          <Link key={stat.label} to={stat.to} className="stat-card">
            <div className="stat-top">
              <span className={`stat-icon ${stat.tone}`}>
                <Icon name={stat.icon} />
              </span>
              <Icon name="arrow" />
            </div>
            <div className="stat-value">{String(stat.value).padStart(2, '0')}</div>
            <div className="stat-label">{stat.label}</div>
            <div className="stat-detail">{stat.detail}</div>
          </Link>
        ))}
      </section>

      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">
                Journeys in motion <span className="count-label">{journeys.length}</span>
              </h2>
              <p className="panel-subtitle">Small steps. Meaningful progress.</p>
            </div>
            <Link to="/journeys" className="journey-link">
              View all <Icon name="arrow" />
            </Link>
          </div>
          <div className="tabs" role="group" aria-label="Journey type">
            {[
              ['all', 'All journeys'],
              ['onboarding', 'Onboarding'],
              ['offboarding', 'Offboarding'],
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
          {shown.length ? (
            <EmployeeTable people={shown} />
          ) : (
            <EmptyState title="A clear runway" description="No journeys match this view." />
          )}
        </section>
        <aside className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">A little attention</h2>
              <p className="panel-subtitle">Let’s keep things moving.</p>
            </div>
            <span className="attention-count">{overdue.length}</span>
          </div>
          <div className="panel-body">
            {attention.length ? (
              attention.map(({ person, task }) => (
                <Link
                  key={task.id}
                  to={`/people/${encodeURIComponent(person.id)}`}
                  className="attention-item"
                >
                  <span className="attention-icon">
                    <Icon name="clock" />
                  </span>
                  <span className="attention-copy">
                    <strong>{task.title}</strong>
                    <span>
                      {person.name} · {task.owner}
                    </span>
                    <small>{relativeDate(task.due)}</small>
                  </span>
                  <Icon name="chevron" />
                </Link>
              ))
            ) : (
              <EmptyState
                title="All caught up"
                description="No overdue tasks. That’s a good feeling."
              />
            )}
          </div>
          <div className="panel-footer">
            <Link to="/tasks?status=overdue" className="journey-link">
              Open task queue <Icon name="arrow" />
            </Link>
          </div>
        </aside>
      </div>

      <div className="dashboard-grid bottom-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">The latest, at a glance</h2>
              <p className="panel-subtitle">Good work happens together.</p>
            </div>
            <Link to="/activity" className="journey-link">
              All activity <Icon name="arrow" />
            </Link>
          </div>
          <div className="panel-body">
            <ActivityList events={state.activity.slice(0, 3)} compact />
          </div>
        </section>
        <section className="welcome-panel">
          <span className="eyebrow">BUILT FOR THE WHOLE JOURNEY</span>
          <h2>
            More human.
            <br />
            Less chasing.
          </h2>
          <p>Clear owners, connected tasks, and one place to see what’s next.</p>
          <button type="button" className="journey-link" onClick={() => openDialog('guide')}>
            Meet your workspace <Icon name="arrow" />
          </button>
          <span className="welcome-decoration" aria-hidden="true">
            ✳
          </span>
        </section>
      </div>
    </>
  );
}
