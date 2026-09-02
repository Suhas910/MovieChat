import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';

const GROUP_ICONS = ['🎬', '🍿', '🎥', '🎞', '📽', '🎦', '🌟', '🏆', '🎭', '🎪'];

function getGroupIcon(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
  return GROUP_ICONS[hash % GROUP_ICONS.length];
}

export default function GroupsList() {
  const { token, username } = useAuth();
  const navigate = useNavigate();

  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  useEffect(() => {
    loadGroups();
  }, []);

  async function loadGroups() {
    setLoading(true);
    setError('');
    try {
      // Now returns [{ group_id, name }, ...] after the backend fix
      const data = await api.myGroups(token);
      setGroups(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateGroup(e) {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    setCreating(true);
    setCreateError('');
    try {
      const created = await api.createGroup(newGroupName.trim(), token);
      setNewGroupName('');
      setCreateOpen(false);
      // Navigate directly to the new group
      if (created?.group_id) {
        navigate(`/groups/${created.group_id}`);
      } else {
        await loadGroups();
      }
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      <div className="page fade-in">
        {/* Page header */}
        <div className="groups-hero">
          <div>
            <h1>Hey, {username || 'there'}</h1>
            <p>Your movie groups — rate and review films together with friends.</p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => setCreateOpen(true)}
            id="create-group-open-btn"
          >
            New Group
          </button>
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: 24 }} id="groups-error">
            {error}
          </div>
        )}

        {/* Groups grid */}
        <div className="section">
          <div className="section-header">
            <div className="section-title">
              <h2>My Groups</h2>
            </div>
            {!loading && (
              <span className="badge badge-velvet">
                {groups.length} {groups.length !== 1 ? 'groups' : 'group'}
              </span>
            )}
          </div>

          {loading ? (
            <div className="grid-groups">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton" style={{ height: 110, borderRadius: 'var(--radius-md)' }} />
              ))}
            </div>
          ) : groups.length === 0 ? (
            <div className="empty-groups-card">
              <span className="empty-icon">🎪</span>
              <h3>No groups yet</h3>
              <p>Create your first group to start watching and rating movies with friends.</p>
              <button
                className="btn btn-primary"
                onClick={() => setCreateOpen(true)}
                id="empty-create-btn"
              >
                Create a Group
              </button>
            </div>
          ) : (
            <div className="grid-groups">
              {groups.map((group) => (
                <GroupCard key={group.group_id} group={group} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Group Modal */}
      <Modal
        isOpen={createOpen}
        onClose={() => { setCreateOpen(false); setCreateError(''); setNewGroupName(''); }}
        title="New Group"
        id="create-group-modal"
      >
        <form onSubmit={handleCreateGroup} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label" htmlFor="new-group-name">Group Name</label>
            <input
              id="new-group-name"
              type="text"
              className="form-input"
              placeholder="e.g. Friday Movie Night"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              required
              autoFocus
            />
          </div>

          {createError && (
            <div className="alert alert-error" id="create-group-error">{createError}</div>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost" onClick={() => setCreateOpen(false)} id="create-group-cancel-btn">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={creating || !newGroupName.trim()} id="create-group-submit-btn">
              {creating ? <><div className="spinner spinner-sm" /> Creating...</> : 'Create Group'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

function GroupCard({ group }) {
  const icon = getGroupIcon(group.name);
  return (
    <Link
      to={`/groups/${group.group_id}`}
      className="group-card"
      id={`group-card-${group.group_id}`}
    >
      <span className="group-card-icon">{icon}</span>
      <div className="group-card-name">{group.name}</div>
      <div className="group-card-meta">Group #{group.group_id}</div>
    </Link>
  );
}
