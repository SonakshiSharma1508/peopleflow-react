import { todayISO, daysUntil, createOnboardingTasks, createOffboardingTasks } from '../domain.js';
import { Icon } from '../components/Icon.jsx';
import { PageHeading, Badge } from '../components/Common.jsx';

export function TemplatesPage() {
  const today = todayISO();
  const templates = [
    {
      type: 'onboarding',
      title: 'A warm welcome',
      description: 'A connected first week, from verified documents to a clear 30-day plan.',
      tasks: createOnboardingTasks('template', today),
    },
    {
      type: 'offboarding',
      title: 'A considered farewell',
      description: 'A coordinated handover, equipment return, and account closure.',
      tasks: createOffboardingTasks('template', today),
    },
  ];
  return (
    <>
      <PageHeading
        eyebrow="CONSISTENCY WITH A HUMAN TOUCH"
        title="Good beginnings are repeatable."
        description="Two built-in workflow templates. Each new journey gets its own dated checklist."
      />
      <div className="guide-grid">
        {templates.map((template) => (
          <section className="panel template-card" key={template.type}>
            <div className="panel-header">
              <div>
                <Badge tone={template.type === 'onboarding' ? 'green' : 'amber'}>
                  {template.type === 'onboarding' ? 'Onboarding' : 'Offboarding'}
                </Badge>
                <h2>{template.title}</h2>
                <p className="panel-subtitle">{template.description}</p>
              </div>
              <Icon name="template" />
            </div>
            <div className="panel-body">
              {template.tasks.map((task, index) => {
                const offset = daysUntil(task.due, today);
                const deadline =
                  offset === 0
                    ? 'On milestone day'
                    : `${Math.abs(offset)} ${Math.abs(offset) === 1 ? 'day' : 'days'} ${offset < 0 ? 'before' : 'after'} milestone`;
                return (
                  <div className="template-task" key={task.id}>
                    <span className="step-number">{index + 1}</span>
                    <div>
                      <strong>{task.title}</strong>
                      <p>
                        {task.owner} · {deadline}
                        {task.required ? '' : ' · Optional'}
                      </p>
                      {task.dependsOn.length > 0 && (
                        <small>
                          <Icon name="lock" />
                          Depends on {task.dependsOn.length} earlier{' '}
                          {task.dependsOn.length === 1 ? 'step' : 'steps'}
                        </small>
                      )}
                      {task.kind === 'asset-assignment' && (
                        <small>
                          <Icon name="laptop" />
                          An assigned item is required.
                        </small>
                      )}
                      {task.kind === 'asset-return' && (
                        <small>
                          <Icon name="laptop" />
                          All assigned items must be returned.
                        </small>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="panel-footer">
              <span className="form-hint">Built-in template · View only</span>
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
