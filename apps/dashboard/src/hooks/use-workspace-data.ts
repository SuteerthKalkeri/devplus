import { useCallback, useEffect, useState } from 'react';
import { api, type Project, type Workspace } from '../api';
import { message } from '../lib/error-message';

async function loadWorkspaceData() {
  return Promise.all([api<Workspace[]>('/organizations'), api<Project[]>('/projects')]);
}

export function useWorkspaceData(routeProjectId?: string) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    const [organizations, projects] = await loadWorkspaceData();
    setWorkspaces(organizations);
    setProjects(projects);
    setSelected((current) =>
      organizations.some((org) => org.id === current) ? current : organizations[0]?.id || '',
    );
  }, []);

  useEffect(() => {
    let active = true;
    loadWorkspaceData()
      .then(([organizations, projects]) => {
        if (!active) return;
        setWorkspaces(organizations);
        setProjects(projects);
        setSelected(organizations[0]?.id || '');
      })
      .catch((error) => {
        if (active) setError(message(error));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Deep links must show the workspace that actually owns the current project.
  const activeWorkspaceId =
    projects.find((project) => project.id === routeProjectId)?.organizationId ?? selected;
  const workspace = workspaces.find((item) => item.id === activeWorkspaceId);
  const visibleProjects = projects.filter(
    (project) => project.organizationId === activeWorkspaceId,
  );

  return {
    workspaces,
    projects,
    selected: activeWorkspaceId,
    setSelected,
    workspace,
    visibleProjects,
    loading,
    error,
    setError,
    refresh,
  };
}
