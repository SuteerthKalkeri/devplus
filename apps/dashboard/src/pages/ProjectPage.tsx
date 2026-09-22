import { useState } from 'react';
import { TelemetryPanel } from '../components/TelemetryPanel';
import { useProjectKeys } from '../hooks/use-project-keys';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Check,
  CheckCircle2,
  ChevronRight,
  Copy,
  KeyRound,
  LayoutGrid,
  Plus,
  Settings,
  Trash2,
  X,
} from 'lucide-react';
import { api, type IngestionKey, type Project } from '../api';
import { ErrorMessage } from '../components/ErrorMessage';
import { NameModal, ConfirmModal } from '../components/dialogs';

export function ProjectPage({
  projects,
  onChanged,
}: {
  projects: Project[];
  onChanged: () => Promise<void>;
}) {
  const { id } = useParams();
  const project = projects.find((project) => project.id === id);
  const { keys, loading, error, setError, refreshKeys } = useProjectKeys(id);
  const [modal, setModal] = useState<'key' | 'rename' | 'delete' | null>(null);
  const [secret, setSecret] = useState('');
  const [copied, setCopied] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const navigate = useNavigate();
  if (!project)
    return (
      <div className="empty">
        <h2>Project not found</h2>
        <p>This project is unavailable or you don’t have access.</p>
        <Link to="/projects">Back to projects</Link>
      </div>
    );
  const activeKeys = keys.filter((key) => !key.revokedAt);
  return (
    <>
      <Link className="back-link" to="/projects">
        Projects <ChevronRight size={13} /> {project.name}
      </Link>
      <div className="page-heading">
        <div>
          <div className="eyebrow">PROJECT OVERVIEW</div>
          <h1>
            {project.name}
            <span className="accent">.</span>
          </h1>
          <p>A home for your application’s signals.</p>
        </div>
        <button className="secondary" onClick={() => setModal('rename')}>
          <Settings size={16} /> Project settings
        </button>
      </div>
      <div className="project-tabs">
        <span className="selected">
          <LayoutGrid size={15} /> Overview
        </span>
        <span>
          Performance <small>Coming next</small>
        </span>
        <span>
          Requests <small>Coming next</small>
        </span>
        <span>
          Errors <small>Coming later</small>
        </span>
      </div>
      <ErrorMessage message={error} />
      <TelemetryPanel key={project.id} projectId={project.id} />
      <section className="keys-section">
        <div className="section-heading">
          <h2>
            Ingestion keys <span className="subtle-count">{activeKeys.length} active</span>
          </h2>
          <button className="secondary" onClick={() => setModal('key')}>
            <Plus size={15} /> Create key
          </button>
        </div>
        <p className="section-description">
          Keys allow your browser SDK to send telemetry to this project. They never grant dashboard
          access.
        </p>
        {secret && (
          <div className="secret-box">
            <div>
              <CheckCircle2 size={18} />
              <strong>Your key is ready. Copy it now.</strong>
              <button
                className="icon-button"
                aria-label="Dismiss generated key"
                onClick={() => {
                  setSecret('');
                  setCopied(false);
                }}
              >
                <X size={16} />
              </button>
            </div>
            <p>
              This full value is shown once. Browser ingestion keys are publicly visible in your
              application.
            </p>
            <div className="secret-value">
              <code>{secret}</code>
              <button
                className="secondary"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(secret);
                    setCopied(true);
                  } catch {
                    setError('Clipboard is unavailable. Select and copy the key manually.');
                  }
                }}
              >
                {copied ? <Check size={15} /> : <Copy size={15} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        )}
        {loading ? (
          <p className="muted">Loading keys…</p>
        ) : keys.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>NAME</th>
                  <th>KEY PREFIX</th>
                  <th>CREATED</th>
                  <th>STATUS</th>
                  <th>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {keys.map((key) => (
                  <tr key={key.id}>
                    <td>
                      <KeyRound size={14} />
                      {key.name}
                    </td>
                    <td>
                      <code>{key.keyPrefix}…</code>
                    </td>
                    <td>{new Date(key.createdAt).toLocaleDateString()}</td>
                    <td>
                      <span className={`status-badge ${key.revokedAt ? 'revoked' : ''}`}>
                        {key.revokedAt ? 'Revoked' : 'Active'}
                      </span>
                    </td>
                    <td>
                      {!key.revokedAt && (
                        <button
                          className="text-button danger-text"
                          onClick={() => setRevoking(key.id)}
                        >
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="keys-empty">
            <KeyRound size={24} />
            <div>
              <h3>No ingestion keys yet</h3>
              <p>Create a key to prepare your SDK integration.</p>
            </div>
          </div>
        )}
      </section>
      <button className="text-button danger-text delete-project" onClick={() => setModal('delete')}>
        <Trash2 size={14} /> Delete project
      </button>
      {(modal === 'key' || modal === 'rename') && (
        <NameModal
          title={modal === 'key' ? 'Create an ingestion key' : 'Rename project'}
          description={
            modal === 'key'
              ? 'Give this key a name you’ll recognize later.'
              : 'Update the display name of your application.'
          }
          label={modal === 'key' ? 'Key name' : 'Project name'}
          placeholder={modal === 'key' ? 'Production browser' : project.name}
          initialValue={modal === 'rename' ? project.name : ''}
          onClose={() => setModal(null)}
          onSubmit={async (name) => {
            if (modal === 'key') {
              const result = await api<{ key: IngestionKey; apiKey: string }>(
                `/projects/${id}/api-keys`,
                { method: 'POST', body: JSON.stringify({ name }) },
              );
              setSecret(result.apiKey);
              setCopied(false);
              await refreshKeys();
            } else {
              await api(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify({ name }) });
              await onChanged();
            }
            setModal(null);
          }}
        />
      )}
      {revoking && (
        <ConfirmModal
          title="Revoke this key?"
          description="This key will no longer be valid for ingestion. You can create a new one at any time."
          action="Revoke key"
          onClose={() => setRevoking(null)}
          onConfirm={async () => {
            await api(`/projects/${id}/api-keys/${revoking}`, { method: 'DELETE' });
            setSecret('');
            await refreshKeys();
            setRevoking(null);
          }}
        />
      )}
      {modal === 'delete' && (
        <ConfirmModal
          title={`Delete ${project.name}?`}
          description="This permanently deletes the project, its events, and all of its ingestion keys."
          action="Delete project"
          onClose={() => setModal(null)}
          onConfirm={async () => {
            await api(`/projects/${id}`, { method: 'DELETE' });
            await onChanged();
            navigate('/projects');
          }}
        />
      )}
    </>
  );
}
