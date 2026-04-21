import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CalendarDays,
  CirclePlus,
  LoaderCircle,
  Pencil,
  ShieldCheck,
  Trash2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { getAuthToken } from '../lib/auth';
import toast from 'react-hot-toast';
import ThemedSelect from '../components/ThemedSelect';

const defaultCandidateForm = {
  name: '',
  party: '',
  manifesto: '',
  campaignTagline: '',
  region: '',
  experience: '',
  priorities: '',
  imageUrl: ''
};

const defaultElectionForm = {
  name: '',
  description: '',
  registrationStartsAt: '',
  registrationEndsAt: '',
  votingStartsAt: '',
  votingEndsAt: ''
};

const lifecycleTransitions = {
  draft: ['registration', 'archived'],
  registration: ['live', 'archived'],
  live: ['counting'],
  counting: ['audited'],
  audited: ['published', 'archived'],
  published: ['archived'],
  archived: []
};

const formatElectionStatus = (status) => {
  if (!status) {
    return 'Unknown';
  }

  const map = {
    draft: 'Draft',
    registration: 'Registration',
    live: 'Voting Live',
    counting: 'Counting',
    audited: 'Audited',
    published: 'Published',
    archived: 'Archived'
  };

  return map[status] || status;
};

const toDateInputValue = (value) => {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toISOString().slice(0, 16);
};

const toIsoOrNull = (value) => (value ? new Date(value).toISOString() : null);

const CandidateManagement = () => {
  const navigate = useNavigate();

  const [candidates, setCandidates] = useState([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [savingCandidate, setSavingCandidate] = useState(false);
  const [error, setError] = useState('');
  const [canManage, setCanManage] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);

  const [editingCandidateId, setEditingCandidateId] = useState('');
  const [candidateForm, setCandidateForm] = useState(defaultCandidateForm);

  const [elections, setElections] = useState([]);
  const [selectedElectionId, setSelectedElectionId] = useState('');
  const [electionSaving, setElectionSaving] = useState(false);
  const [editingElectionId, setEditingElectionId] = useState('');
  const [electionForm, setElectionForm] = useState(defaultElectionForm);
  const [transitioningElectionId, setTransitioningElectionId] = useState('');

  const selectedElection = elections.find((election) => election._id === selectedElectionId) || null;
  const managementSummary = useMemo(
    () => ({
      totalElections: elections.length,
      liveElections: elections.filter((election) => election.status === 'live').length,
      totalCandidates: elections.reduce((sum, election) => sum + Number(election.totalCandidates || 0), 0),
      totalVotes: elections.reduce((sum, election) => sum + Number(election.totalVotesCast || 0), 0)
    }),
    [elections]
  );

  const loadManagedElections = async (preferredElectionId = '') => {
    const response = await api.get('/vote/elections/manage');
    const electionList = response.data?.elections || [];

    setElections(electionList);

    const nextElectionId = electionList.some((election) => election._id === preferredElectionId)
      ? preferredElectionId
      : (electionList[0]?._id || '');

    setSelectedElectionId(nextElectionId);
    return nextElectionId;
  };

  const loadCandidatesForElection = async (electionId) => {
    if (!electionId) {
      setCandidates([]);
      return;
    }

    setLoadingCandidates(true);
    setError('');

    try {
      const response = await api.get('/vote/candidates/manage', {
        params: { electionId }
      });

      setCandidates(response.data?.candidates || []);
    } catch (requestError) {
      const message = requestError.response?.data?.message || 'Unable to load candidate management data.';
      setError(message);
      toast.error(message);
    } finally {
      setLoadingCandidates(false);
    }
  };

  const bootstrapManagement = async () => {
    if (!getAuthToken()) {
      navigate('/login');
      return;
    }

    setBootstrapping(true);
    setError('');

    try {
      const meResponse = await api.get('/auth/me');

      if (meResponse.data.role !== 'Admin') {
        setCanManage(false);
        setError('Candidate and election management is restricted to admin accounts only.');
        return;
      }

      setCanManage(true);
      const electionId = await loadManagedElections(selectedElectionId);
      await loadCandidatesForElection(electionId);
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        navigate('/login');
        return;
      }

      if (requestError.response?.status === 403) {
        setCanManage(false);
        setError('Candidate and election management is restricted to admin accounts only.');
        return;
      }

      setError(requestError.response?.data?.message || 'Unable to load admin management data.');
    } finally {
      setBootstrapping(false);
    }
  };

  useEffect(() => {
    bootstrapManagement();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!canManage || !selectedElectionId || bootstrapping) {
      return;
    }

    loadCandidatesForElection(selectedElectionId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedElectionId]);

  const resetCandidateForm = () => {
    setCandidateForm(defaultCandidateForm);
    setEditingCandidateId('');
  };

  const onCandidateChange = (event) => {
    const { name, value } = event.target;
    setCandidateForm((current) => ({
      ...current,
      [name]: value
    }));
    setError('');
  };

  const onEditCandidate = (candidate) => {
    setEditingCandidateId(candidate._id);
    setCandidateForm({
      name: candidate.name || '',
      party: candidate.party || '',
      manifesto: candidate.manifesto || '',
      campaignTagline: candidate.campaignTagline || '',
      region: candidate.region || '',
      experience: candidate.experience || '',
      priorities: (candidate.priorities || []).join(', '),
      imageUrl: candidate.imageUrl || ''
    });
    setError('');
  };

  const onSubmitCandidate = async (event) => {
    event.preventDefault();

    if (!canManage) {
      const message = 'Candidate management is restricted to admin accounts only.';
      setError(message);
      toast.error(message);
      return;
    }

    if (!selectedElectionId) {
      const message = 'Select an election before managing candidates.';
      setError(message);
      toast.error(message);
      return;
    }

    if (!candidateForm.name || !candidateForm.party || !candidateForm.manifesto) {
      const message = 'Name, party, and manifesto are required.';
      setError(message);
      toast.error(message);
      return;
    }

    setSavingCandidate(true);
    setError('');

    const payload = {
      ...candidateForm,
      electionId: selectedElectionId,
      priorities: candidateForm.priorities
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    };

    try {
      if (editingCandidateId) {
        await api.put(`/vote/candidates/manage/${editingCandidateId}`, payload);
        toast.success('Candidate updated successfully.');
      } else {
        await api.post('/vote/candidates/manage', payload);
        toast.success('Candidate created successfully.');
      }

      resetCandidateForm();
      await loadCandidatesForElection(selectedElectionId);
      await loadManagedElections(selectedElectionId);
    } catch (requestError) {
      const message = requestError.response?.data?.message || 'Failed to save candidate.';
      setError(message);
      toast.error(message);
    } finally {
      setSavingCandidate(false);
    }
  };

  const deleteCandidate = async (candidateId) => {
    if (!canManage) {
      return;
    }

    setSavingCandidate(true);
    setError('');

    try {
      await api.delete(`/vote/candidates/manage/${candidateId}`);
      toast.success('Candidate removed successfully.');

      if (editingCandidateId === candidateId) {
        resetCandidateForm();
      }

      await loadCandidatesForElection(selectedElectionId);
      await loadManagedElections(selectedElectionId);
    } catch (requestError) {
      const message = requestError.response?.data?.message || 'Failed to delete candidate.';
      setError(message);
      toast.error(message);
    } finally {
      setSavingCandidate(false);
    }
  };

  const onDeleteCandidate = (candidateId) => {
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

  const onElectionChange = (event) => {
    const { name, value } = event.target;
    setElectionForm((current) => ({
      ...current,
      [name]: value
    }));
    setError('');
  };

  const resetElectionForm = () => {
    setElectionForm(defaultElectionForm);
    setEditingElectionId('');
  };

  const onEditElection = (election) => {
    setEditingElectionId(election._id);
    setElectionForm({
      name: election.name || '',
      description: election.description || '',
      registrationStartsAt: toDateInputValue(election.registrationStartsAt),
      registrationEndsAt: toDateInputValue(election.registrationEndsAt),
      votingStartsAt: toDateInputValue(election.votingStartsAt),
      votingEndsAt: toDateInputValue(election.votingEndsAt)
    });
  };

  const onSubmitElection = async (event) => {
    event.preventDefault();

    if (!canManage) {
      const message = 'Election management is restricted to admin accounts only.';
      setError(message);
      toast.error(message);
      return;
    }

    if (!electionForm.name.trim()) {
      const message = 'Election name is required.';
      setError(message);
      toast.error(message);
      return;
    }

    setElectionSaving(true);
    setError('');

    const payload = {
      name: electionForm.name.trim(),
      description: electionForm.description.trim(),
      registrationStartsAt: toIsoOrNull(electionForm.registrationStartsAt),
      registrationEndsAt: toIsoOrNull(electionForm.registrationEndsAt),
      votingStartsAt: toIsoOrNull(electionForm.votingStartsAt),
      votingEndsAt: toIsoOrNull(electionForm.votingEndsAt)
    };

    try {
      if (editingElectionId) {
        await api.put(`/vote/elections/manage/${editingElectionId}`, payload);
        toast.success('Election updated successfully.');
      } else {
        await api.post('/vote/elections/manage', payload);
        toast.success('Election created successfully.');
      }

      const activeElectionId = editingElectionId || selectedElectionId;
      const nextElectionId = await loadManagedElections(activeElectionId);

      if (nextElectionId) {
        await loadCandidatesForElection(nextElectionId);
      }

      resetElectionForm();
    } catch (requestError) {
      const message = requestError.response?.data?.message || 'Failed to save election.';
      setError(message);
      toast.error(message);
    } finally {
      setElectionSaving(false);
    }
  };

  const onTransitionElection = async (electionId, nextStatus) => {
    setTransitioningElectionId(electionId);
    setError('');

    try {
      await api.post(`/vote/elections/manage/${electionId}/transition`, { nextStatus });
      toast.success(`Election moved to ${formatElectionStatus(nextStatus)}.`);

      const nextElectionId = await loadManagedElections(selectedElectionId || electionId);
      if (nextElectionId) {
        await loadCandidatesForElection(nextElectionId);
      }
    } catch (requestError) {
      const message = requestError.response?.data?.message || 'Failed to transition election status.';
      setError(message);
      toast.error(message);
    } finally {
      setTransitioningElectionId('');
    }
  };

  return (
    <main className="min-h-screen page-shell pt-20 pb-14">
      <div className="section-wrap space-y-6">
        <header className="glass-panel p-6 md:p-7">
          <p className="eyebrow mb-4">
            <ShieldCheck className="w-4 h-4" /> Election + Candidate Management
          </p>
          <h1 className="text-2xl sm:text-3xl text-[#102347] mb-2">Run Election Lifecycle Operations</h1>
          <p className="text-[#5e7398] max-w-3xl">
            Create elections, move lifecycle states, and manage candidate records per election context.
          </p>
        </header>

        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <article className="surface-card p-4">
            <p className="text-xs uppercase tracking-[0.1em] text-[#61759c] mb-1">Total Elections</p>
            <p className="text-2xl font-semibold text-[#12305d]">{managementSummary.totalElections}</p>
          </article>
          <article className="surface-card p-4">
            <p className="text-xs uppercase tracking-[0.1em] text-[#61759c] mb-1">Live Elections</p>
            <p className="text-2xl font-semibold text-[#12305d]">{managementSummary.liveElections}</p>
          </article>
          <article className="surface-card p-4">
            <p className="text-xs uppercase tracking-[0.1em] text-[#61759c] mb-1">Registered Candidates</p>
            <p className="text-2xl font-semibold text-[#12305d]">{managementSummary.totalCandidates}</p>
          </article>
          <article className="surface-card p-4">
            <p className="text-xs uppercase tracking-[0.1em] text-[#61759c] mb-1">Tracked Votes</p>
            <p className="text-2xl font-semibold text-[#12305d]">{managementSummary.totalVotes}</p>
          </article>
        </section>

        {error && (
          <div className="surface-card p-4 border border-[#f1c6c6] bg-[#fff1f1] text-[#a43a3a] flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {bootstrapping ? (
          <section className="surface-card p-8 text-center">
            <LoaderCircle className="w-6 h-6 animate-spin text-[#1f66f4] mx-auto mb-2" />
            <p className="text-sm text-[#60759b]">Loading admin management workspace...</p>
          </section>
        ) : !canManage ? (
          <section className="surface-card p-6">
            <h2 className="text-2xl text-[#102347] mb-3">Restricted Access</h2>
            <p className="text-sm text-[#5f7398]">
              Election and candidate management is available only for admin accounts.
            </p>
          </section>
        ) : (
          <>
            <section className="surface-card p-6">
              <h2 className="text-2xl text-[#102347] mb-4">Election Lifecycle Studio</h2>

              <form onSubmit={onSubmitElection} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-[#183769] mb-2">Election Name</label>
                  <input
                    name="name"
                    value={electionForm.name}
                    onChange={onElectionChange}
                    className="form-field"
                    placeholder="National General Election 2027"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#183769] mb-2">Description</label>
                  <input
                    name="description"
                    value={electionForm.description}
                    onChange={onElectionChange}
                    className="form-field"
                    placeholder="Optional election description"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#183769] mb-2">Registration Starts</label>
                  <input
                    type="datetime-local"
                    name="registrationStartsAt"
                    value={electionForm.registrationStartsAt}
                    onChange={onElectionChange}
                    className="form-field"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#183769] mb-2">Registration Ends</label>
                  <input
                    type="datetime-local"
                    name="registrationEndsAt"
                    value={electionForm.registrationEndsAt}
                    onChange={onElectionChange}
                    className="form-field"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#183769] mb-2">Voting Starts</label>
                  <input
                    type="datetime-local"
                    name="votingStartsAt"
                    value={electionForm.votingStartsAt}
                    onChange={onElectionChange}
                    className="form-field"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#183769] mb-2">Voting Ends</label>
                  <input
                    type="datetime-local"
                    name="votingEndsAt"
                    value={electionForm.votingEndsAt}
                    onChange={onElectionChange}
                    className="form-field"
                  />
                </div>

                <div className="md:col-span-2 flex flex-wrap gap-3">
                  <button
                    type="submit"
                    disabled={electionSaving}
                    className="btn-primary inline-flex items-center gap-2 disabled:opacity-60"
                  >
                    <CirclePlus className="w-4 h-4" /> {editingElectionId ? 'Update Election' : 'Create Election'}
                  </button>

                  {editingElectionId && (
                    <button type="button" onClick={resetElectionForm} className="btn-secondary">
                      Cancel Edit
                    </button>
                  )}
                </div>
              </form>

              <div className="space-y-4">
                {elections.length === 0 ? (
                  <p className="text-sm text-[#60759b]">No elections created yet.</p>
                ) : (
                  elections.map((election) => {
                    const transitions = lifecycleTransitions[election.status] || [];
                    const isSelected = election._id === selectedElectionId;
                    const isTransitioning = transitioningElectionId === election._id;

                    return (
                      <article
                        key={election._id}
                        className={`rounded-2xl border p-4 ${isSelected ? 'border-[#1f66f4] bg-[#f4f8ff]' : 'border-[#d6e2f6] bg-white'}`}
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                          <div>
                            <p className="font-semibold text-[#12305d]">{election.name}</p>
                            <p className="text-xs text-[#5f7398] mt-1">Status: {formatElectionStatus(election.status)}</p>
                            <p className="text-xs text-[#5f7398] mt-1">Candidates: {election.totalCandidates || 0} | Votes: {election.totalVotesCast || 0}</p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedElectionId(election._id)}
                              className={`text-xs rounded-full px-3 py-1.5 border ${isSelected ? 'border-[#1f66f4] bg-[#1f66f4] text-white' : 'border-[#bfd1f8] bg-[#eaf2ff] text-[#1f66f4]'}`}
                            >
                              {isSelected ? 'Selected' : 'Select'}
                            </button>

                            <button
                              type="button"
                              onClick={() => onEditElection(election)}
                              className="text-xs rounded-full border border-[#bfd1f8] bg-[#eaf2ff] text-[#1f66f4] px-3 py-1.5 inline-flex items-center gap-1"
                            >
                              <Pencil className="w-3.5 h-3.5" /> Edit
                            </button>

                            {transitions.map((nextStatus) => (
                              <button
                                key={`${election._id}-${nextStatus}`}
                                type="button"
                                disabled={isTransitioning}
                                onClick={() => onTransitionElection(election._id, nextStatus)}
                                className="text-xs rounded-full border border-[#d4def3] bg-white text-[#35598e] px-3 py-1.5 disabled:opacity-60"
                              >
                                {isTransitioning ? 'Transitioning...' : `Move to ${formatElectionStatus(nextStatus)}`}
                              </button>
                            ))}
                          </div>
                        </div>
                      </article>
                    );
                  })
                )}
              </div>
            </section>

            <section className="surface-card p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                <h2 className="text-2xl text-[#102347]">Candidate Studio</h2>
                <div className="w-full md:w-[360px]">
                  <label htmlFor="candidate-election-picker" className="block text-xs uppercase tracking-[0.12em] text-[#5f7398] mb-2">
                    Active Election
                  </label>
                  <ThemedSelect
                    id="candidate-election-picker"
                    value={selectedElectionId}
                    onValueChange={setSelectedElectionId}
                    disabled={elections.length === 0}
                    placeholder={elections.length === 0 ? 'No elections available' : 'Select election'}
                    options={elections.map((election) => ({
                      value: election._id,
                      label: election.name
                    }))}
                  />
                </div>
              </div>

              {selectedElection && (
                <div className="rounded-2xl border border-[#d2def6] bg-[#f7fbff] p-4 mb-5">
                  <p className="text-sm text-[#12305d] inline-flex items-center gap-2">
                    <CalendarDays className="w-4 h-4" /> {selectedElection.name}
                  </p>
                  <p className="text-xs text-[#5f7398] mt-1">Lifecycle: {formatElectionStatus(selectedElection.status)}</p>
                </div>
              )}

              <form onSubmit={onSubmitCandidate} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-[#183769] mb-2">Candidate Name</label>
                  <input name="name" value={candidateForm.name} onChange={onCandidateChange} className="form-field" placeholder="Full name" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#183769] mb-2">Party</label>
                  <input name="party" value={candidateForm.party} onChange={onCandidateChange} className="form-field" placeholder="Party name" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#183769] mb-2">Campaign Tagline</label>
                  <input name="campaignTagline" value={candidateForm.campaignTagline} onChange={onCandidateChange} className="form-field" placeholder="Short campaign line" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#183769] mb-2">Region</label>
                  <input name="region" value={candidateForm.region} onChange={onCandidateChange} className="form-field" placeholder="Region or district" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#183769] mb-2">Experience</label>
                  <input name="experience" value={candidateForm.experience} onChange={onCandidateChange} className="form-field" placeholder="Experience summary" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#183769] mb-2">Image URL</label>
                  <input name="imageUrl" value={candidateForm.imageUrl} onChange={onCandidateChange} className="form-field" placeholder="https://example.com/candidate.jpg" />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-[#183769] mb-2">Manifesto</label>
                  <textarea name="manifesto" value={candidateForm.manifesto} onChange={onCandidateChange} className="form-field min-h-[96px]" placeholder="Candidate manifesto" />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-[#183769] mb-2">Priorities (comma separated)</label>
                  <input name="priorities" value={candidateForm.priorities} onChange={onCandidateChange} className="form-field" placeholder="Healthcare, education, transport" />
                </div>

                <div className="md:col-span-2 flex flex-wrap gap-3">
                  <button
                    type="submit"
                    disabled={savingCandidate}
                    className="btn-primary inline-flex items-center gap-2 disabled:opacity-60"
                  >
                    <CirclePlus className="w-4 h-4" /> {editingCandidateId ? 'Update Candidate' : 'Add Candidate'}
                  </button>

                  {editingCandidateId && (
                    <button type="button" onClick={resetCandidateForm} className="btn-secondary">
                      Cancel Edit
                    </button>
                  )}
                </div>
              </form>

              {loadingCandidates ? (
                <div className="text-center py-8">
                  <LoaderCircle className="w-6 h-6 animate-spin text-[#1f66f4] mx-auto mb-2" />
                  <p className="text-sm text-[#60759b]">Loading candidates...</p>
                </div>
              ) : candidates.length === 0 ? (
                <p className="text-sm text-[#60759b]">No candidates available for this election yet.</p>
              ) : (
                <div className="space-y-3">
                  {candidates.map((candidate) => (
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
                            onClick={() => onEditCandidate(candidate)}
                            className="text-xs rounded-full border border-[#bfd1f8] bg-[#eaf2ff] text-[#1f66f4] px-3 py-1.5 inline-flex items-center gap-1"
                          >
                            <Pencil className="w-3.5 h-3.5" /> Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => onDeleteCandidate(candidate._id)}
                            disabled={savingCandidate}
                            className="text-xs rounded-full border border-[#f3c8c8] bg-[#fff1f1] text-[#b13a3a] px-3 py-1.5 inline-flex items-center gap-1 disabled:opacity-60"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </button>
                        </div>
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
