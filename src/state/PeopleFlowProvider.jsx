import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import { createSeed } from '../seed.js';
import { loadState, saveState, STORAGE_KEY } from '../storage.js';
import * as domain from '../domain.js';
import { directoryCSV, downloadFile } from '../utils/download.js';
import { sessionReducer } from './sessionReducer.js';

const PeopleFlowContext = createContext(null);

function initializeSession() {
  const { state, warning } = loadState();
  return { data: state, warning, recoveryMode: Boolean(warning) };
}

export function PeopleFlowProvider({ children }) {
  const [session, dispatch] = useReducer(sessionReducer, undefined, initializeSession);
  const sessionRef = useRef(session);
  const [dialog, setDialog] = useState(null);
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Set());
  const nextToast = useRef(0);

  const notify = useCallback((message, type = 'success') => {
    const id = ++nextToast.current;
    setToasts((current) => [...current.slice(-2), { id, message, type }]);
    const timer = window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
      timers.current.delete(timer);
    }, 6000);
    timers.current.add(timer);
  }, []);

  useEffect(
    () => () => {
      for (const timer of timers.current) window.clearTimeout(timer);
      timers.current.clear();
    },
    [],
  );

  const replaceSession = useCallback((next) => {
    sessionRef.current = next;
    dispatch({ type: 'session/replaced', session: next });
  }, []);

  const commit = useCallback(
    (data, message, { reset = false } = {}) => {
      const current = sessionRef.current;
      const recoveryMode = reset ? false : current.recoveryMode;
      const result = recoveryMode ? { warning: current.warning } : saveState(data);
      replaceSession({ data, warning: result.warning, recoveryMode });
      if (message) notify(message);
    },
    [notify, replaceSession],
  );

  useEffect(() => {
    function handleStorage(event) {
      if (event.key === STORAGE_KEY || event.key === null) {
        const next = sessionReducer(sessionRef.current, { type: 'session/conflict' });
        sessionRef.current = next;
        dispatch({ type: 'session/conflict' });
      }
    }
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const actions = useMemo(() => {
    const apply = (operation, message) => {
      // IDs/timestamps are created here, outside the pure React reducer.
      const current = sessionRef.current.data;
      const next = operation(current, current.role);
      commit(next, message);
      return next;
    };
    return {
      setRole(role) {
        if (!['HR', 'IT', 'Manager'].includes(role)) throw new Error('Choose a valid demo role.');
        commit({ ...sessionRef.current.data, role }, `Now previewing the ${role} role.`);
      },
      toggleTask(id, taskId) {
        apply((state, role) => domain.toggleTask(state, id, taskId, role), 'Checklist updated.');
      },
      completeJourney(id) {
        apply(
          (state, role) => domain.completeJourney(state, id, role),
          'Journey complete. Here’s to the next chapter.',
        );
      },
      addNote(id, text) {
        apply((state, role) => domain.addNote(state, id, text, role), 'Note added for the team.');
      },
      assignAsset(id, input) {
        apply((state, role) => domain.assignAsset(state, id, input, role), 'Equipment assigned.');
      },
      setAssetReturned(id, assetId, returned) {
        apply(
          (state, role) => domain.setAssetReturned(state, id, assetId, returned, role),
          'Equipment record updated.',
        );
      },
      createEmployee(input) {
        const next = apply(
          (state, role) => domain.createEmployee(state, input, role),
          'A new beginning is ready.',
        );
        return next.employees[0].id;
      },
      startOffboarding(id, date) {
        apply(
          (state, role) => domain.startOffboarding(state, id, date, role),
          'Offboarding checklist created.',
        );
      },
      resetDemo() {
        commit(createSeed(), 'A fresh demo, ready to explore.', { reset: true });
      },
      exportJSON() {
        downloadFile(
          `peopleflow-react-${domain.todayISO()}.json`,
          JSON.stringify(sessionRef.current.data, null, 2),
          'application/json',
        );
        notify('Your demo export is ready.');
      },
      exportCSV() {
        downloadFile(
          `peopleflow-directory-${domain.todayISO()}.csv`,
          directoryCSV(sessionRef.current.data.employees),
          'text/csv;charset=utf-8',
        );
        notify('Your directory export is ready.');
      },
    };
  }, [commit, notify]);

  const perform = useCallback(
    (callback) => {
      try {
        callback();
        return true;
      } catch (error) {
        notify(error.message || 'That action could not be completed.', 'error');
        return false;
      }
    },
    [notify],
  );
  const openDialog = useCallback(
    (type, options = {}) => {
      if (type === 'employee' && sessionRef.current.data.role !== 'HR') {
        notify('Switch the demo role to HR to create an employee.', 'error');
        return;
      }
      setDialog({ type, ...options });
    },
    [notify],
  );
  const closeDialog = useCallback(() => setDialog(null), []);
  const value = useMemo(
    () => ({
      state: session.data,
      warning: session.warning,
      recoveryMode: session.recoveryMode,
      actions,
      notify,
      perform,
      dialog,
      openDialog,
      closeDialog,
      toasts,
    }),
    [session, actions, notify, perform, dialog, openDialog, closeDialog, toasts],
  );
  return <PeopleFlowContext.Provider value={value}>{children}</PeopleFlowContext.Provider>;
}

export function usePeopleFlow() {
  const context = useContext(PeopleFlowContext);
  if (!context) throw new Error('usePeopleFlow must be used inside PeopleFlowProvider.');
  return context;
}
