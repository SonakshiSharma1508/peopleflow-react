import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import { usePeopleFlow } from '../state/PeopleFlowProvider.jsx';
import { Icon } from './Icon.jsx';
import { Avatar } from './Common.jsx';

const NAVIGATION = [
  ['/', 'Overview', 'grid'],
  ['/people', 'People', 'people'],
  ['/journeys', 'Journeys', 'journey'],
  ['/tasks', 'Task queue', 'tasks'],
  ['/activity', 'Activity', 'clock'],
  ['/templates', 'Templates', 'template'],
];

function useSmallViewport() {
  const [small, setSmall] = useState(() => window.matchMedia('(max-width: 800px)').matches);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 800px)');
    const change = () => setSmall(media.matches);
    media.addEventListener('change', change);
    return () => media.removeEventListener('change', change);
  }, []);
  return small;
}

export function AppShell({ children }) {
  const { state, warning, recoveryMode, actions, perform, dialog, openDialog, toasts } =
    usePeopleFlow();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const mobile = useSmallViewport();
  const menuButton = useRef(null),
    sidebar = useRef(null),
    main = useRef(null);
  const restoreMenuFocus = useRef(false);
  const open = menuOpen && mobile;
  const label = /^\/(people|person)\/.+/.test(pathname)
    ? 'Employee profile'
    : NAVIGATION.find(([path]) => path === pathname)?.[1] ||
      (pathname === '/settings' ? 'Workspace settings' : 'Workspace');

  useEffect(() => {
    document.title = `${label} · PeopleFlow React`;
    document.querySelector('.page-title')?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }, [pathname, label]);
  useEffect(() => {
    document.body.classList.toggle('menu-open', open);
    if (open) sidebar.current?.querySelector('a')?.focus();
    if (!open && restoreMenuFocus.current) {
      if (!dialog) menuButton.current?.focus();
      restoreMenuFocus.current = false;
    }
    return () => document.body.classList.remove('menu-open');
  }, [open, dialog]);
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname, mobile]);
  useEffect(() => {
    function onKey(event) {
      const typing =
        event.target instanceof Element &&
        event.target.matches('input,textarea,select,[contenteditable="true"]');
      if (event.key === '/' && !typing && !dialog) {
        event.preventDefault();
        openDialog('search');
      }
      if (event.key === 'Escape' && open) {
        restoreMenuFocus.current = true;
        setMenuOpen(false);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [dialog, openDialog, open]);

  function closeMenu(event) {
    restoreMenuFocus.current = open && event?.currentTarget?.tagName !== 'A';
    setMenuOpen(false);
  }
  function trapDrawer(event) {
    if (!open || event.key !== 'Tab') return;
    const elements = [
      ...sidebar.current.querySelectorAll('a,button,select,input,[tabindex="0"]'),
    ].filter((element) => !element.disabled);
    const first = elements[0],
      last = elements.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <>
      <a
        className="skip-link"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          main.current?.focus();
        }}
      >
        Skip to main content
      </a>
      <div className="app-shell">
        <aside
          id="sidebar"
          ref={sidebar}
          className="sidebar"
          aria-label="Workspace navigation"
          inert={mobile && !open}
          onKeyDown={trapDrawer}
        >
          <Link className="brand" to="/" aria-label="PeopleFlow home" onClick={closeMenu}>
            <span className="brand-mark">
              <Icon name="leaf" />
            </span>
            <span>
              peopleflow<span className="brand-period">.</span>
            </span>
          </Link>
          <button
            type="button"
            className="icon-button mobile-menu drawer-close"
            aria-label="Close navigation"
            onClick={closeMenu}
          >
            <Icon name="close" />
          </button>
          <div className="workspace-switch">
            <span className="workspace-avatar">N</span>
            <span>
              <strong>Northstar Studio</strong>
              <small>People workspace</small>
            </span>
            <span className="workspace-dot" aria-hidden="true" />
          </div>
          <p className="nav-label">WORKSPACE</p>
          <nav>
            {NAVIGATION.map(([path, name, icon]) => (
              <NavLink
                key={path}
                to={path}
                end={path === '/'}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={closeMenu}
              >
                <Icon name={icon} />
                <span>{name}</span>
                {path === '/journeys' && (
                  <span className="nav-count">
                    {
                      state.employees.filter((person) =>
                        ['onboarding', 'offboarding'].includes(person.journey),
                      ).length
                    }
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <NavLink
              to="/settings"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={closeMenu}
            >
              <Icon name="settings" />
              <span>Workspace settings</span>
            </NavLink>
            <div className="demo-card">
              <span className="demo-label">
                <span className="status-dot" /> YOUR EXPLORATION SPACE
              </span>
              <strong>Make yourself at home.</strong>
              <p>
                Try a journey. Change a role.
                <br />
                It’s all fictional, all yours.
              </p>
              <button
                type="button"
                onClick={() => {
                  closeMenu();
                  openDialog('guide');
                }}
              >
                Explore the demo <Icon name="arrow" />
              </button>
            </div>
            <div className="user-menu">
              <Avatar person={{ name: 'Alex Morgan' }} />
              <span className="user-copy">
                <strong>Alex Morgan</strong>
                <small>Workflow preview · {state.role}</small>
              </span>
              <button
                type="button"
                className="icon-button"
                aria-label="About this demo"
                onClick={() => {
                  closeMenu();
                  openDialog('guide');
                }}
              >
                <Icon name="help" />
              </button>
            </div>
            <div className="sidebar-footer">
              <span>PEOPLEFLOW REACT</span>
              <span>V2.0</span>
            </div>
          </div>
        </aside>
        {open && (
          <button
            type="button"
            className="mobile-overlay"
            tabIndex={-1}
            aria-label="Close navigation overlay"
            onClick={closeMenu}
          />
        )}
        <div className="main-shell" inert={open}>
          <header className="topbar">
            <div className="breadcrumbs">
              <button
                type="button"
                ref={menuButton}
                className="icon-button mobile-menu"
                aria-label="Open navigation"
                aria-expanded={open}
                aria-controls="sidebar"
                onClick={() => setMenuOpen((value) => !value)}
              >
                <Icon name="menu" />
              </button>
              <span className="breadcrumb-workspace">Workspace</span>
              <Icon name="chevron" />
              <span>{label}</span>
            </div>
            <div className="topbar-actions">
              <button
                type="button"
                className="search-trigger"
                aria-label="Find anything"
                onClick={() => openDialog('search')}
              >
                <Icon name="search" />
                <span>Find anything</span>
                <kbd className="keyboard-key">/</kbd>
              </button>
              <span className="topbar-divider" />
              <label className="role-control">
                <span>Demo role</span>
                <select
                  aria-label="Demo role"
                  value={state.role}
                  onChange={(event) => perform(() => actions.setRole(event.target.value))}
                >
                  {['HR', 'IT', 'Manager'].map((role) => (
                    <option key={role}>{role}</option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="icon-button notification-button"
                aria-label="Open overdue task notifications"
                onClick={() => openDialog('notifications')}
              >
                <Icon name="bell" />
                <span className="notification-dot" />
              </button>
            </div>
          </header>
          <main className="main-content" id="main-content" tabIndex={-1} ref={main}>
            {warning && (
              <div className="storage-warning" role="alert">
                <Icon name="alert" />
                <div>
                  {warning}
                  {recoveryMode &&
                    ' Changes remain temporary until you reset or reload as appropriate.'}{' '}
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => perform(actions.exportJSON)}
                  >
                    Export current session
                  </button>
                </div>
              </div>
            )}
            <div id="page">{children}</div>
            <footer className="content-footer">
              <span>Made for the moments that matter.</span>
              <span>React demo · Saved in your browser</span>
            </footer>
          </main>
        </div>
      </div>
      <div className="toast-region" role="status" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => (
          <div className={`toast ${toast.type === 'error' ? 'toast-error' : ''}`} key={toast.id}>
            <Icon name={toast.type === 'error' ? 'alert' : 'check'} />
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </>
  );
}
