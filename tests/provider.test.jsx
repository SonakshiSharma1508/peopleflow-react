import { StrictMode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PeopleFlowProvider, usePeopleFlow } from '../src/state/PeopleFlowProvider.jsx';
import { STORAGE_KEY } from '../src/storage.js';
import { createSeed } from '../src/seed.js';

function Probe() {
  const { state, actions, warning, recoveryMode } = usePeopleFlow();
  return (
    <>
      <output aria-label="Current role">{state.role}</output>
      <output aria-label="Noah stage">
        {state.employees.find((person) => person.id === 'EMP-1041').journey}
      </output>
      <output aria-label="Event count">{state.activity.length}</output>
      <output aria-label="Recovery mode">{String(recoveryMode)}</output>
      {warning && <p role="alert">{warning}</p>}
      <button onClick={() => actions.setRole('IT')}>Preview IT</button>
      <button onClick={() => actions.setRole('Manager')}>Preview Manager</button>
      <button onClick={() => actions.completeJourney('EMP-1041')}>Finish Noah</button>
      <button onClick={actions.resetDemo}>Restore sample</button>
    </>
  );
}
const showProbe = () =>
  render(
    <StrictMode>
      <PeopleFlowProvider>
        <Probe />
      </PeopleFlowProvider>
    </StrictMode>,
  );

describe('React context and persistence', () => {
  it('updates consumers and saves under the v2 namespace without altering v1 data', async () => {
    const user = userEvent.setup();
    localStorage.setItem('peopleflow.demo.v1', 'original-v1-snapshot');
    showProbe();
    await user.click(screen.getByRole('button', { name: 'Preview IT' }));
    expect(screen.getByLabelText('Current role')).toHaveTextContent('IT');
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).role).toBe('IT');
    expect(localStorage.getItem('peopleflow.demo.v1')).toBe('original-v1-snapshot');
  });
  it('records a command once under StrictMode rather than generating events inside the reducer', async () => {
    const user = userEvent.setup();
    const baseline = createSeed().activity.length;
    showProbe();
    await user.click(screen.getByRole('button', { name: 'Finish Noah' }));
    expect(screen.getByLabelText('Noah stage')).toHaveTextContent('active');
    expect(screen.getByLabelText('Event count')).toHaveTextContent(String(baseline + 1));
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).activity).toHaveLength(baseline + 1);
  });
  it('preserves an unreadable saved value while allowing temporary edits, then resets explicitly', async () => {
    const user = userEvent.setup();
    localStorage.setItem(STORAGE_KEY, '{not valid JSON');
    showProbe();
    expect(screen.getByRole('alert')).toHaveTextContent('could not be loaded');
    await user.click(screen.getByRole('button', { name: 'Preview IT' }));
    expect(screen.getByLabelText('Current role')).toHaveTextContent('IT');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('{not valid JSON');
    await user.click(screen.getByRole('button', { name: 'Restore sample' }));
    expect(screen.getByLabelText('Recovery mode')).toHaveTextContent('false');
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).schemaVersion).toBe(1);
  });
  it('suspends later writes after a storage event rather than overwriting another tab', async () => {
    const user = userEvent.setup();
    showProbe();
    const other = { ...createSeed(), role: 'IT' };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(other));
    fireEvent(window, new StorageEvent('storage', { key: STORAGE_KEY }));
    expect(screen.getByRole('alert')).toHaveTextContent('another tab');
    await user.click(screen.getByRole('button', { name: 'Preview Manager' }));
    expect(screen.getByLabelText('Current role')).toHaveTextContent('Manager');
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).role).toBe('IT');
  });
  it('retains a working React update and reports a failed durable save', async () => {
    const user = userEvent.setup();
    showProbe();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Quota exceeded');
    });
    await user.click(screen.getByRole('button', { name: 'Preview IT' }));
    expect(screen.getByLabelText('Current role')).toHaveTextContent('IT');
    expect(screen.getByRole('alert')).toHaveTextContent('could not be saved');
  });
});
