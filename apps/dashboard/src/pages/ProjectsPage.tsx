import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Box, ChevronRight, Folder, Plus } from 'lucide-react';
import { type Project, type Workspace } from '../api';

export function ProjectsPage({
  projects,
  workspace,
  onCreate,
  compact = false,
}: {
  projects: Project[];
  workspace?: Workspace;
  onCreate: () => void;
  compact?: boolean;
}) {
  return (
    <section className={compact ? 'projects-section' : ''}>
      <div className={compact ? 'section-heading' : 'page-heading'}>
        <div>
          {compact ? (
            <h2>
              Your projects <span className="subtle-count">{projects.length}</span>
            </h2>
          ) : (
            <>
              <div className="eyebrow">YOUR APPLICATIONS</div>
              <h1>
                Projects<span className="accent">.</span>
              </h1>
              <p>One place for every application in your workspace.</p>
            </>
          )}
        </div>
        {compact ? (
          <Link className="muted-link" to="/projects">
            View all projects <ArrowRight size={14} />
          </Link>
        ) : (
          <button className="primary" onClick={onCreate}>
            <Plus size={16} />
            {workspace ? 'New project' : 'Create workspace'}
          </button>
        )}
      </div>
      {projects.length ? (
        <div className="project-grid">
          {projects.map((project) => (
            <Link className="project-card" to={`/projects/${project.id}`} key={project.id}>
              <div className="project-card-top">
                <div className="section-icon">
                  <Box size={22} />
                </div>
                <ArrowUpRight size={18} />
              </div>
              <h3>{project.name}</h3>
              <p>{project.slug}</p>
              <div className="project-card-bottom">
                <span>
                  <span className="neutral-dot" /> View telemetry
                </span>
                <ChevronRight size={15} />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="empty-projects">
          <div className="empty-icon">
            <Folder size={24} />
          </div>
          <h3>Your next project belongs here.</h3>
          <p>
            {workspace
              ? 'Add your first application to get started.'
              : 'Create a workspace, then add your first application.'}
          </p>
          <button className="secondary" onClick={onCreate}>
            <Plus size={15} />
            {workspace ? 'Create project' : 'Create workspace'}
          </button>
        </div>
      )}
    </section>
  );
}
