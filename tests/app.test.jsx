import { StrictMode } from 'react';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { PeopleFlowProvider } from '../src/state/PeopleFlowProvider.jsx';
import { STORAGE_KEY } from '../src/storage.js';
import { createSeed } from '../src/seed.js';
import { daysUntil } from '../src/domain.js';
import App from '../src/App.jsx';

function showApp(path = '/') {
  return render(
    <StrictMode>
      <MemoryRouter initialEntries={[path]}>
        <PeopleFlowProvider>
          <App />
        </PeopleFlowProvider>
      </MemoryRouter>
    </StrictMode>,
  );
}

describe('PeopleFlow React user journeys', () => {
  it('explains HR ownership before another role starts filling the employee form', async () => {
    const user = userEvent.setup();
    showApp('/people');
    await user.selectOptions(screen.getByLabelText('Demo role', { exact: true }), 'IT');
    await user.click(screen.getByRole('button', { name: 'Add employee', exact: true }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Switch the demo role to HR to create an employee.',
    );
  });

  it('restores mobile navigation focus after Escape and a sidebar dialog closes', async () => {
    vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
      matches: true,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    const user = userEvent.setup();
    showApp('/people');
    const trigger = screen.getByRole('button', { name: 'Open navigation', exact: true });
    await user.click(trigger);
    expect(document.querySelector('.main-shell')).toHaveAttribute('inert');
    await user.keyboard('{Escape}');
    expect(trigger).toHaveFocus();
    expect(document.querySelector('.main-shell')).not.toHaveAttribute('inert');
    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: 'Explore the demo', exact: true }));
    await user.click(screen.getByRole('button', { name: 'Close dialog', exact: true }));
    expect(trigger).toHaveFocus();
  });
  it('creates an employee through controlled form review and opens the generated profile', async () => {
    const user = userEvent.setup();
    showApp('/people');
    await user.click(screen.getByRole('button', { name: 'Add employee', exact: true }));
    const dialog = screen.getByRole('dialog', { name: 'A new beginning.' });
    await user.type(within(dialog).getByLabelText('Full name'), 'Jamie Chen');
    await user.type(within(dialog).getByLabelText('Work email'), 'jamie.chen@example.com');
    await user.type(within(dialog).getByLabelText('Job title'), 'Frontend Developer');
    await user.type(within(dialog).getByLabelText('Manager', { exact: true }), 'Nikhil Rao');
    await user.type(within(dialog).getByLabelText('Location'), 'Remote');
    await user.click(within(dialog).getByRole('button', { name: 'Review journey' }));
    expect(within(dialog).getByRole('heading', { name: 'Jamie Chen' })).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Back', exact: true }));
    expect(within(dialog).getByLabelText('Full name')).toHaveValue('Jamie Chen');
    await user.click(within(dialog).getByRole('button', { name: 'Review journey' }));
    await user.click(within(dialog).getByRole('button', { name: 'Create employee', exact: true }));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Jamie Chen' }),
    ).toBeInTheDocument();
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(saved.employees.find((person) => person.name === 'Jamie Chen').tasks).toHaveLength(7);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('keeps duplicate employee creation out of the review/commit flow with visible feedback', async () => {
    const user = userEvent.setup();
    showApp('/people');
    await user.click(screen.getByRole('button', { name: 'Add employee', exact: true }));
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText('Full name'), 'Another Person');
    await user.type(within(dialog).getByLabelText('Work email'), 'another@example.com');
    await user.clear(within(dialog).getByLabelText('Employee ID'));
    await user.type(within(dialog).getByLabelText('Employee ID'), 'emp-1045');
    await user.type(within(dialog).getByLabelText('Job title'), 'Analyst');
    await user.type(within(dialog).getByLabelText('Manager', { exact: true }), 'Manager Name');
    await user.type(within(dialog).getByLabelText('Location'), 'Remote');
    await user.click(within(dialog).getByRole('button', { name: 'Review journey' }));
    expect(within(dialog).getByRole('alert')).toHaveTextContent('already exists');
    expect(within(dialog).getByLabelText('Full name')).toHaveValue('Another Person');
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('enforces task owners and prerequisites, requires assignment, and closes onboarding', async () => {
    const user = userEvent.setup();
    showApp('/people/EMP-1045');
    expect(
      screen.getByRole('button', { name: 'Complete Provision work accounts', exact: true }),
    ).toBeDisabled();
    await user.click(
      screen.getByRole('button', { name: 'Complete Verify employment documents', exact: true }),
    );
    await user.click(
      screen.getByRole('button', { name: 'Complete Set up the employee record', exact: true }),
    );
    await user.selectOptions(screen.getByLabelText('Demo role', { exact: true }), 'IT');
    await user.click(
      screen.getByRole('button', { name: 'Complete Provision work accounts', exact: true }),
    );
    expect(
      screen.getByRole('button', { name: 'Complete Prepare laptop and equipment', exact: true }),
    ).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Assign equipment', exact: true }));
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText('Equipment name'), 'ThinkPad T14');
    await user.type(within(dialog).getByLabelText('Serial / asset number'), 'qa-laptop-1045');
    await user.click(within(dialog).getByRole('button', { name: 'Assign equipment', exact: true }));
    await user.click(
      screen.getByRole('button', { name: 'Complete Prepare laptop and equipment', exact: true }),
    );
    await user.selectOptions(screen.getByLabelText('Demo role', { exact: true }), 'Manager');
    await user.click(
      screen.getByRole('button', { name: 'Complete Run team orientation', exact: true }),
    );
    await user.click(
      screen.getByRole('button', { name: 'Complete Agree on the first 30-day plan', exact: true }),
    );
    await user.selectOptions(screen.getByLabelText('Demo role', { exact: true }), 'HR');
    await user.click(screen.getByRole('button', { name: 'Complete onboarding', exact: true }));
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)).employees.find(
      (person) => person.id === 'EMP-1045',
    );
    expect(saved.journey).toBe('active');
    expect(saved.assets[0].serial).toBe('QA-LAPTOP-1045');
    expect(saved.tasks.find((task) => task.id.endsWith('-buddy')).completed).toBe(false);
    expect(screen.getByRole('button', { name: 'Start offboarding', exact: true })).toBeEnabled();
  });

  it('keeps exits blocked until equipment returns and required work are complete', async () => {
    const user = userEvent.setup();
    showApp('/people/EMP-1021');
    await user.selectOptions(screen.getByLabelText('Demo role', { exact: true }), 'IT');
    expect(
      screen.getByRole('button', { name: 'Complete Confirm equipment returned', exact: true }),
    ).toBeDisabled();
    await user.click(screen.getByLabelText('MacBook Air 13-inch returned', { exact: true }));
    await user.click(
      screen.getByRole('button', { name: 'Complete Confirm equipment returned', exact: true }),
    );
    await user.click(
      screen.getByRole('button', { name: 'Complete Revoke work account access', exact: true }),
    );
    await user.selectOptions(screen.getByLabelText('Demo role', { exact: true }), 'HR');
    await user.click(
      screen.getByRole('button', { name: 'Complete Record final settlement review', exact: true }),
    );
    await user.click(screen.getByRole('button', { name: 'Complete exit', exact: true }));
    expect(
      JSON.parse(localStorage.getItem(STORAGE_KEY)).employees.find(
        (person) => person.id === 'EMP-1021',
      ).journey,
    ).toBe('departed');
    expect(
      screen.queryByRole('button', { name: 'Complete exit', exact: true }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Reopen Confirm exit date and checklist', exact: true }),
    ).toBeDisabled();
  });

  it('renders user notes as text and preserves them after a remount', async () => {
    const user = userEvent.setup();
    const first = showApp('/people/EMP-1045');
    await user.click(screen.getByRole('button', { name: /Notes.*0/ }));
    const note = '<script>example</script> is plain coordination text.';
    await user.type(screen.getByLabelText('Add a coordination note'), note);
    await user.click(screen.getByRole('button', { name: 'Add note', exact: true }));
    expect(screen.getByText(note)).toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();
    first.unmount();
    showApp('/people/EMP-1045');
    await user.click(screen.getByRole('button', { name: /Notes.*1/ }));
    expect(screen.getByText(note)).toBeInTheDocument();
  });

  it('combines directory filters with pagination and an actionable empty state', async () => {
    const user = userEvent.setup();
    showApp('/people');
    expect(document.querySelectorAll('.data-table tbody tr')).toHaveLength(8);
    await user.click(screen.getByRole('button', { name: 'Next', exact: true }));
    expect(document.querySelectorAll('.data-table tbody tr')).toHaveLength(6);
    await user.type(
      screen.getByRole('searchbox', { name: 'Search employees', exact: true }),
      'Omar',
    );
    expect(document.querySelectorAll('.data-table tbody tr')).toHaveLength(1);
    expect(screen.getByRole('link', { name: /Omar Hassan Product Analyst/ })).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Filter department', { exact: true }), 'Design');
    expect(screen.getByText('No people found')).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: 'Clear filters', exact: true })[0]);
    expect(document.querySelectorAll('.data-table tbody tr')).toHaveLength(8);
  });

  it('shows all overdue tasks including blocked work in the routed overdue filter', async () => {
    const expected = createSeed()
      .employees.filter((person) => ['onboarding', 'offboarding'].includes(person.journey))
      .flatMap((person) => person.tasks)
      .filter((task) => !task.completed && daysUntil(task.due) < 0).length;
    showApp('/tasks?status=overdue');
    await waitFor(() => expect(document.querySelectorAll('.task-row')).toHaveLength(expected));
    expect(screen.getAllByText('Blocked').length).toBeGreaterThan(0);
  });

  it('returns focus to the original trigger after wizard review is cancelled', async () => {
    const user = userEvent.setup();
    showApp('/people');
    const trigger = screen.getByRole('button', { name: 'Add employee', exact: true });
    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: 'Close dialog', exact: true }));
    expect(trigger).toHaveFocus();
  });
});
