import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CirclePlus, LoaderCircle, Pencil, ShieldCheck, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { getAuthToken } from '../lib/auth';
import toast from 'react-hot-toast';

const defaultForm = {
  name: '',
  party: '',
  electionName: 'National General Election 2026',
  manifesto: '',
  campaignTagline: '',
  region: '',
  experience: '',
  priorities: '',
  imageUrl: ''
};

const CandidateManagement = () => {
  const navigate = useNavigate();

  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [canManage, setCanManage] = useState(false);

  const [editingId, setEditingId] = useState('');
  const [form, setForm] = useState(defaultForm);

  const groupedByElection = useMemo(() => {
    return candidates.reduce((acc, candidate) => {
      const electionName = candidate.electionName || 'Unassigned Election';

      if (!acc[electionName]) {
        acc[electionName] = [];
      }

      acc[electionName].push(candidate);
      return acc;
    }, {});
  }, [candidates]);

  const loadManagedCandidates = async () => {
    if (!getAuthToken()) {
      navigate('/login');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const meResponse = await api.get('/auth/me');

      if (meResponse.data.role !== 'Admin') {
        setCanManage(false);
        setCandidates([]);
        setError('Candidate management is restricted to admin accounts only.');
        return;
      }

      setCanManage(true);
      const response = await api.get('/vote/candidates/manage');
      setCandidates(response.data);
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        navigate('/login');
        return;
      }

      if (requestError.response?.status === 403) {
        setCanManage(false);
        setError('Candidate management is restricted to admin accounts only.');
        return;
      }

      setError(requestError.response?.data?.message || 'Unable to load candidate management data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadManagedCandidates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value
    }));
    setError('');
  };

  const resetForm = () => {
    setForm(defaultForm);
    setEditingId('');
  };

  const onEdit = (candidate) => {
    setEditingId(candidate._id);
    setForm({
      name: candidate.name || '',
      party: candidate.party || '',
      electionName: candidate.electionName || defaultForm.electionName,
      manifesto: candidate.manifesto || '',
      campaignTagline: candidate.campaignTagline || '',
      region: candidate.region || '',
      experience: candidate.experience || '',
      priorities: (candidate.priorities || []).join(', '),
      imageUrl: candidate.imageUrl || ''
    });
    setError('');
  };

  const deleteCandidate = async (candidateId) => {
    if (!canManage) {
      return;
    }

    setSaving(true);
    setError('');

    try {
      await api.delete(`/vote/candidates/manage/${candidateId}`);
      setCandidates((current) => current.filter((candidate) => candidate._id !== candidateId));
      toast.success('Candidate removed successfully.');

      if (editingId === candidateId) {
        resetForm();
      }
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to delete candidate.');
      toast.error(requestError.response?.data?.message || 'Failed to delete candidate.');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = (candidateId) => {
    toast.custom(
      (t) => (
        <div className="w-[min(92vw,420px)] rounded-2xl border border-[#bfd1f8] bg-white p-4 shadow-[0_18px_42px_rgba(16,38,79,0.22)]">
          <p className="text-sm font-semibold text-[#122f5d] mb-1">Delete Candidate</p>
          <p className="text-sm text-[#5f7398] leading-relaxed mb-4">
            Delete this candidate? This action cannot be undone.
          </p>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => toast.dismiss(t.id)}
              className="btn-secondary !py-2 !px-4 text-xs"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                toast.dismiss(t.id);
                deleteCandidate(candidateId);
              }}
              className="text-xs rounded-full border border-[#f3c8c8] bg-[#fff1f1] text-[#b13a3a] px-4 py-2 font-semibold"
            >
              Delete
            </button>
          </div>
        </div>
      ),
      {
        duration: Infinity,
        position: 'top-center'
      }
    );
  };

  const onSubmit = async (event) => {
    event.preventDefault();

    if (!canManage) {
      setError('Candidate management is restricted to admin accounts only.');
      toast.error('Candidate management is restricted to admin accounts only.');
      return;
    }

    if (!form.name || !form.party || !form.manifesto) {
      setError('Name, party, and manifesto are required.');
      toast.error('Name, party, and manifesto are required.');
      return;
    }

    setSaving(true);
    setError('');

    const payload = {
      ...form,
      priorities: form.priorities
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    };

    try {
      if (editingId) {
        const response = await api.put(`/vote/candidates/manage/${editingId}`, payload);

        setCandidates((current) =>
          current.map((candidate) => (candidate._id === editingId ? response.data : candidate))
        );
        toast.success('Candidate updated successfully.');
      } else {
        const response = await api.post('/vote/candidates/manage', payload);
        setCandidates((current) => [response.data, ...current]);
        toast.success('Candidate created successfully.');
      }

      resetForm();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to save candidate.');
      toast.error(requestError.response?.data?.message || 'Failed to save candidate.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen pt-28 pb-16">
      <div className="section-wrap space-y-6">
        <header className="glass-panel p-8 md:p-10">
          <p className="eyebrow mb-4">
            <ShieldCheck className="w-4 h-4" /> Candidate Management
          </p>
          <h1 className="text-4xl sm:text-5xl text-[#102347] mb-2">Manage Election Candidates</h1>
          <p className="text-[#5e7398] max-w-3xl">
            Create, update, or remove candidates per election to keep ballot data current and result calculations accurate.
          </p>
        </header>

        {error && (
          <div className="surface-card p-4 border border-[#f1c6c6] bg-[#fff1f1] text-[#a43a3a] flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {!loading && !canManage ? (
          <section className="surface-card p-6">
            <h2 className="text-2xl text-[#102347] mb-3">Restricted Access</h2>
            <p className="text-sm text-[#5f7398]">
              Candidate management is available only for admin accounts. Please sign in with admin credentials.
            </p>
          </section>
        ) : (
          <>
            <section className="surface-card p-6">
          <h2 className="text-2xl text-[#102347] mb-4">{editingId ? 'Edit Candidate' : 'Add Candidate'}</h2>

          <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-[#183769] mb-2">Candidate Name</label>
              <input name="name" value={form.name} onChange={onChange} className="form-field" placeholder="Full name" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#183769] mb-2">Party</label>
              <input name="party" value={form.party} onChange={onChange} className="form-field" placeholder="Party name" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#183769] mb-2">Election Name</label>
              <input name="electionName" value={form.electionName} onChange={onChange} className="form-field" placeholder="Election name" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#183769] mb-2">Campaign Tagline</label>
              <input name="campaignTagline" value={form.campaignTagline} onChange={onChange} className="form-field" placeholder="Short campaign line" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#183769] mb-2">Region</label>
              <input name="region" value={form.region} onChange={onChange} className="form-field" placeholder="Region or district" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#183769] mb-2">Experience</label>
              <input name="experience" value={form.experience} onChange={onChange} className="form-field" placeholder="Experience summary" />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-[#183769] mb-2">Manifesto</label>
              <textarea name="manifesto" value={form.manifesto} onChange={onChange} className="form-field min-h-[96px]" placeholder="Candidate manifesto" />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-[#183769] mb-2">Priorities (comma separated)</label>
              <input
                name="priorities"
                value={form.priorities}
                onChange={onChange}
                className="form-field"
                placeholder="Healthcare, education, transport"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-[#183769] mb-2">Image URL</label>
              <input
                name="imageUrl"
                value={form.imageUrl}
                onChange={onChange}
                className="form-field"
                placeholder="https://example.com/candidate.jpg"
              />
            </div>

            <div className="md:col-span-2 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving}
                className="btn-primary inline-flex items-center gap-2 disabled:opacity-60"
              >
                <CirclePlus className="w-4 h-4" /> {editingId ? 'Update Candidate' : 'Add Candidate'}
              </button>

              {editingId && (
                <button type="button" onClick={resetForm} className="btn-secondary">
                  Cancel Edit
                </button>
              )}
            </div>
          </form>
            </section>

            <section className="surface-card p-6">
          <h2 className="text-2xl text-[#102347] mb-4">Managed Candidates</h2>

          {loading ? (
            <div className="text-center py-8">
              <LoaderCircle className="w-6 h-6 animate-spin text-[#1f66f4] mx-auto mb-2" />
              <p className="text-sm text-[#60759b]">Loading candidates...</p>
            </div>
          ) : Object.keys(groupedByElection).length === 0 ? (
            <p className="text-sm text-[#60759b]">No candidates available yet.</p>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedByElection).map(([electionName, electionCandidates]) => (
                <div key={electionName} className="rounded-2xl border border-[#d6e2f6] bg-white p-4">
                  <h3 className="text-lg text-[#12305d] mb-3">{electionName}</h3>
                  <div className="space-y-3">
                    {electionCandidates.map((candidate) => (
                      <div key={candidate._id} className="rounded-xl border border-[#e1e8f8] p-3">
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                          <div>
                            <p className="font-semibold text-[#12305d]">{candidate.name}</p>
                            <p className="text-sm text-[#56719a]">{candidate.party}</p>
                            <p className="text-xs text-[#6a7fa6] mt-1">Votes: {candidate.voteCount}</p>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => onEdit(candidate)}
                              className="text-xs rounded-full border border-[#bfd1f8] bg-[#eaf2ff] text-[#1f66f4] px-3 py-1.5 inline-flex items-center gap-1"
                            >
                              <Pencil className="w-3.5 h-3.5" /> Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => onDelete(candidate._id)}
                              disabled={saving}
                              className="text-xs rounded-full border border-[#f3c8c8] bg-[#fff1f1] text-[#b13a3a] px-3 py-1.5 inline-flex items-center gap-1 disabled:opacity-60"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
            </section>
          </>
        )}
      </div>
    </main>
  );
};

export default CandidateManagement;
