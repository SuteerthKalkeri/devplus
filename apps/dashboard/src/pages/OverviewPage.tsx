import { Activity, ArrowRight, Box, Check, Plus, Radio } from 'lucide-react';
import { type Account, type Project, type Workspace } from '../api';
import { ProjectsPage } from './ProjectsPage';

export function OverviewPage({
  account,
  workspace,
  projects,
  onCreate,
}: {
  account: Account;
  workspace?: Workspace;
  projects: Project[];
  onCreate: () => void;
}) {
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">YOUR APPLICATIONS, IN FOCUS</div>
          <h1>
            Good to see you, {account.name.split(' ')[0]}
            <span className="accent">.</span>
          </h1>
          <p>A little clarity on everything you’re building.</p>
        </div>
        <button className="primary" onClick={onCreate}>
          <Plus size={16} />
          {workspace ? 'New project' : 'Create workspace'}
        </button>
      </div>
      <div className="welcome-card">
        <div>
          <span className="pill">LET’S GET YOU SET UP</span>
          <h2>
            Great software starts
            <br />
            with understanding it.
          </h2>
          <p>
            Create a project and prepare its ingestion key.
            <br />
            Connect the browser SDK and watch requests arrive.
          </p>
          <button className="welcome-link" onClick={onCreate}>
            {workspace ? 'Create a project' : 'Create your first workspace'}{' '}
            <ArrowRight size={17} />
          </button>
        </div>
        <div className="pulse-visual" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="pulse-center">
            <Activity size={56} strokeWidth={1.4} />
          </div>
          <span className="orbit-label label-one">
            <Box size={13} /> Your application
          </span>
          <span className="orbit-label label-two">
            <Radio size={13} /> A clearer signal
          </span>
        </div>
      </div>
      <div className="section-heading">
        <h2>
          Getting started <span className="subtle-count">3 steps</span>
        </h2>
        <span>ONE STEP CLOSER TO CLARITY</span>
      </div>
      <div className="step-grid">
        <SetupStep
          number="01"
          title="Create a workspace"
          text="Keep your team’s applications in one place."
          done={!!workspace}
        />
        <SetupStep
          number="02"
          title="Add your first project"
          text="A dedicated space for each application."
          done={projects.length > 0}
        />
        <SetupStep
          number="03"
          title="Prepare an ingestion key"
          text="Open a project to create its first key."
        />
      </div>
      <ProjectsPage projects={projects} workspace={workspace} onCreate={onCreate} compact />
    </>
  );
}
function SetupStep({
  number,
  title,
  text,
  done = false,
}: {
  number: string;
  title: string;
  text: string;
  done?: boolean;
}) {
  return (
    <div className={`step-card ${done ? 'done' : ''}`}>
      <div className="step-number">{done ? <Check size={17} /> : number}</div>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
