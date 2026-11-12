import { usePeopleFlow } from '../state/PeopleFlowProvider.jsx';
import { Icon } from '../components/Icon.jsx';
import { PageHeading } from '../components/Common.jsx';

export function SettingsPage() {
  const { state, warning, recoveryMode, actions, openDialog } = usePeopleFlow();
  return (
    <>
      <PageHeading
        eyebrow="YOUR DEMO WORKSPACE"
        title="Room to explore."
        description="Fictional people. Real interactions. Changes are saved in this browser."
      />
      <div className="settings-grid">
        <section className="panel">
          <div className="panel-header">
            <h2 className="panel-title">About this workspace</h2>
            <Icon name="leaf" />
          </div>
          <div className="panel-body">
            <dl className="info-list">
              <dt>Workspace</dt>
              <dd>Northstar Studio · Fictional company</dd>
              <dt>Version</dt>
              <dd>2.0 · React and JavaScript</dd>
              <dt>Data storage</dt>
              <dd>
                {warning || recoveryMode
                  ? 'Session changes / storage warning'
                  : 'This browser · localStorage'}
              </dd>
              <dt>Current demo role</dt>
              <dd>{state.role}</dd>
              <dt>Employees</dt>
              <dd>{state.employees.length} fictional profiles</dd>
            </dl>
            <p className="form-hint">
              The role switcher demonstrates workflow ownership. This version has no login, server,
              or enforced security. Use fictional data only.
            </p>
            <p className="form-hint">
              The React demo uses its own browser storage key. Changes to this version do not
              replace the original JavaScript demo’s saved data.
            </p>
          </div>
        </section>
        <section className="panel">
          <div className="panel-header">
            <h2 className="panel-title">Make yourself at home</h2>
          </div>
          <div className="panel-body settings-actions">
            <div>
              <h3>A quick introduction</h3>
              <p>Walk through a dependency, a handover, and a successful journey.</p>
              <button className="btn btn-secondary" onClick={() => openDialog('guide')}>
                <Icon name="help" />
                Open guided tour
              </button>
            </div>
            <div>
              <h3>Keep a snapshot</h3>
              <p>
                Download the current demo state as JSON for inspection. This version does not
                restore imports.
              </p>
              <button className="btn btn-secondary" onClick={() => actions.exportJSON()}>
                <Icon name="download" />
                Export demo data
              </button>
            </div>
            <div>
              <h3>A fresh start</h3>
              <p>
                Restore the original fictional profiles, roles, and checklists. This replaces your
                changes to the React demo in this browser.
              </p>
              <button className="btn btn-danger" onClick={() => openDialog('reset')}>
                <Icon name="reset" />
                Reset demo
              </button>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
