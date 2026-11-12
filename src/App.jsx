import { Navigate, Route, Routes, Link } from 'react-router';
import { AppShell } from './components/AppShell.jsx';
import { Dialogs } from './components/Dialogs.jsx';
import { OverviewPage } from './pages/OverviewPage.jsx';
import { PeoplePage } from './pages/PeoplePage.jsx';
import { JourneysPage } from './pages/JourneysPage.jsx';
import { TasksPage } from './pages/TasksPage.jsx';
import { EmployeePage } from './pages/EmployeePage.jsx';
import { ActivityPage } from './pages/ActivityPage.jsx';
import { TemplatesPage } from './pages/TemplatesPage.jsx';
import { SettingsPage } from './pages/SettingsPage.jsx';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';

function NotFoundPage() {
  return (
    <section className="empty-state">
      <h1 className="page-title" tabIndex={-1}>
        This page took a different path.
      </h1>
      <p>Use the workspace navigation to find your next step.</p>
      <Link className="btn btn-primary" to="/">
        Back to Overview
      </Link>
    </section>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppShell>
        <Routes>
          <Route path="/" element={<OverviewPage />} />
          <Route path="/overview" element={<Navigate replace to="/" />} />
          <Route path="/people" element={<PeoplePage />} />
          <Route path="/people/:employeeId" element={<EmployeePage />} />
          <Route path="/person/:employeeId" element={<EmployeePage />} />
          <Route path="/journeys" element={<JourneysPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/activity" element={<ActivityPage />} />
          <Route path="/templates" element={<TemplatesPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AppShell>
      <Dialogs />
    </ErrorBoundary>
  );
}
