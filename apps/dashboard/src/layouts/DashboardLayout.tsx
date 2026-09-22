import { useState } from 'react';
import { useWorkspaceData } from '../hooks/use-workspace-data';
import { Link, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronRight, Folder, LayoutGrid, LogOut, Plus } from 'lucide-react';
import { api, type Account, type Project, type Workspace } from '../api';
import { Brand } from '../components/Brand';
import { ErrorMessage } from '../components/ErrorMessage';
import { NameModal } from '../components/dialogs';
import { message } from '../lib/error-message';
import { OverviewPage } from '../pages/OverviewPage';
import { ProjectsPage } from '../pages/ProjectsPage';
import { ProjectPage } from '../pages/ProjectPage';

export function DashboardLayout({ account, onLogout }: { account: Account; onLogout: () => void }) {
  const location = useLocation();
  const {
    workspaces,
    projects,
    selected,
    setSelected,
    workspace,
    visibleProjects,
    loading,
    error,
    setError,
    refresh,
  } = useWorkspaceData(location.pathname.match(/^\/projects\/([^/]+)/)?.[1]);
  const [modal, setModal] = useState<'workspace' | 'project' | null>(null);
  const navigate = useNavigate();
  async function logout() {
    try {
      await api('/auth/logout', { method: 'POST' });
      onLogout();
    } catch (error) {
      setError(message(error));
    }
  }
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand-link" to="/">
          <Brand />
        </Link>
        <div className="workspace-picker">
          <div className="workspace-avatar">{workspace?.name.slice(0, 1).toUpperCase() || 'W'}</div>
          <div>
            <span className="tiny-label">WORKSPACE</span>
            <select
              aria-label="Workspace"
              value={selected}
              onChange={(event) => {
                setSelected(event.target.value);
                navigate('/');
              }}
            >
              <option value="" disabled>
                Select workspace
              </option>
              {workspaces.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>
          <ChevronDown size={14} />
        </div>
        <button className="text-button new-workspace" onClick={() => setModal('workspace')}>
          <Plus size={14} /> New workspace
        </button>
        <div className="nav-label">WORKSPACE</div>
        <nav>
          <NavLink end to="/">
            <LayoutGrid size={17} /> Overview
          </NavLink>
          <NavLink to="/projects">
            <Folder size={17} /> Projects{' '}
            <span className="nav-count">{visibleProjects.length}</span>
          </NavLink>
        </nav>
        <div className="nav-label project-label">YOUR PROJECTS</div>
        <div className="project-nav">
          {visibleProjects.length ? (
            visibleProjects.map((project) => (
              <NavLink key={project.id} to={`/projects/${project.id}`}>
                <span className="project-dot" />
                {project.name}
              </NavLink>
            ))
          ) : (
            <p>No projects yet</p>
          )}
        </div>
        <div className="sidebar-bottom">
          <div className="build-note">
            <span className="live-dot" /> Foundation release <span>01</span>
          </div>
          <div className="account">
            <div className="avatar">{account.name.slice(0, 1).toUpperCase()}</div>
            <div>
              <strong>{account.name}</strong>
              <span>{account.email}</span>
            </div>
            <button className="icon-button" aria-label="Sign out" title="Sign out" onClick={logout}>
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div>
            <span>Workspace</span>
            <ChevronRight size={14} />
            <strong>{workspace?.name || 'Getting started'}</strong>
          </div>
          <div className="topbar-right">
            <span className="local-badge">LOCAL DEVELOPMENT</span>
            <span className="avatar small">{account.name.slice(0, 1).toUpperCase()}</span>
          </div>
        </header>
        <main className="main-content">
          <ErrorMessage message={error} />
          {loading ? (
            <p className="muted">Loading your workspace…</p>
          ) : error ? (
            <button
              className="secondary"
              onClick={() => {
                setError('');
                refresh().catch((error) => setError(message(error)));
              }}
            >
              Retry loading workspace
            </button>
          ) : (
            <Routes>
              <Route
                path="/"
                element={
                  <OverviewPage
                    account={account}
                    workspace={workspace}
                    projects={visibleProjects}
                    onCreate={() => setModal(workspace ? 'project' : 'workspace')}
                  />
                }
              />
              <Route
                path="/projects"
                element={
                  <ProjectsPage
                    projects={visibleProjects}
                    workspace={workspace}
                    onCreate={() => setModal(workspace ? 'project' : 'workspace')}
                  />
                }
              />
              <Route
                path="/projects/:id/*"
                element={
                  <ProjectPage
                    key={location.pathname.split('/')[2]}
                    projects={projects}
                    onChanged={refresh}
                  />
                }
              />
              <Route
                path="*"
                element={
                  <div className="empty">
                    <h2>Page not found</h2>
                    <Link to="/">Back to overview</Link>
                  </div>
                }
              />
            </Routes>
          )}
        </main>
        <footer className="main-footer">
          <span>DEVPULSE / A LITTLE MORE CLARITY.</span>
          <span>Made for what you’re building.</span>
        </footer>
      </div>
      {modal && (
        <NameModal
          title={modal === 'workspace' ? 'Create a workspace' : 'Create a project'}
          description={
            modal === 'workspace'
              ? 'A shared home for your projects and their telemetry.'
              : 'Give the application you want to monitor a home.'
          }
          label={modal === 'workspace' ? 'Workspace name' : 'Project name'}
          placeholder={modal === 'workspace' ? 'Acme Engineering' : 'Storefront'}
          onClose={() => setModal(null)}
          onSubmit={async (name) => {
            if (modal === 'workspace') {
              const org = await api<Workspace>('/organizations', {
                method: 'POST',
                body: JSON.stringify({ name }),
              });
              await refresh();
              setSelected(org.id);
              navigate('/');
            } else {
              const project = await api<Project>(`/organizations/${selected}/projects`, {
                method: 'POST',
                body: JSON.stringify({ name }),
              });
              await refresh();
              navigate(`/projects/${project.id}`);
            }
            setModal(null);
          }}
        />
      )}
    </div>
  );
}
