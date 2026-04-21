import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BadgeCheck,
  ClipboardList,
  Gavel,
  LoaderCircle,
  RefreshCw,
  ShieldAlert
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { clearAuthSession, getAuthToken } from '../lib/auth';
import ThemedSelect from '../components/ThemedSelect';

const DISPUTE_TYPE_OPTIONS = [
  { value: 'dispute', label: 'Dispute Case' },
  { value: 'recount', label: 'Recount Request' }
];

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'open', label: 'Open' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'rejected', label: 'Rejected' }
];

const TYPE_FILTER_OPTIONS = [
  { value: 'all', label: 'All Types' },
  { value: 'dispute', label: 'Dispute' },
  { value: 'recount', label: 'Recount' }
];

const defaultFormData = {
  electionId: '',
  type: 'dispute',
  subject: '',
  description: '',
  receiptCode: '',
  candidateId: ''
};

const formatCaseStatus = (status) => {
  const map = {
    open: 'Open',
    under_review: 'Under Review',
    resolved: 'Resolved',
    rejected: 'Rejected'
  };

  return map[status] || status;
};

const getStatusPillClass = (status) => {
  if (status === 'resolved') {
    return 'bg-[#eefcf3] text-[#1f7d3f] border-[#b9e5c6]';
  }

  if (status === 'rejected') {
    return 'bg-[#fff1f1] text-[#aa3d3d] border-[#efc7c7]';
  }

  if (status === 'under_review') {
    return 'bg-[#fff8e8] text-[#9b6a17] border-[#f2ddae]';
  }

  return 'bg-[#edf4ff] text-[#1f66f4] border-[#bfd4fa]';
};

const formatCaseType = (type) => (type === 'recount' ? 'Recount' : 'Dispute');

const formatDateTime = (value) => {
  if (!value) {
    return 'N/A';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'N/A';
  }

  return date.toLocaleString();
};

const RecountDisputes = () => {
  const navigate = useNavigate();

  const [bootstrapping, setBootstrapping] = useState(true);
  const [loadingMyCases, setLoadingMyCases] = useState(false);
  const [loadingAdminCases, setLoadingAdminCases] = useState(false);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [submittingCase, setSubmittingCase] = useState(false);

  const [profile, setProfile] = useState(null);
  const [elections, setElections] = useState([]);
  const [selectedElectionId, setSelectedElectionId] = useState('');
  const [candidateOptions, setCandidateOptions] = useState([]);

  const [formData, setFormData] = useState(defaultFormData);
  const [myCases, setMyCases] = useState([]);
  const [adminCases, setAdminCases] = useState([]);
  const [mySummary, setMySummary] = useState(null);
  const [adminSummary, setAdminSummary] = useState(null);

  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [resolutionDrafts, setResolutionDrafts] = useState({});

  const [error, setError] = useState('');

  const isAdmin = profile?.role === 'Admin';

  const selectedElection = useMemo(
    () => elections.find((election) => election._id === selectedElectionId) || null,
    [elections, selectedElectionId]
  );

  const selectedCandidate = useMemo(
    () => candidateOptions.find((candidate) => candidate._id === formData.candidateId) || null,
    [candidateOptions, formData.candidateId]
  );

  const bootstrap = async () => {
    if (!getAuthToken()) {
      navigate('/login');
      return;
    }

    setBootstrapping(true);
    setError('');

    try {
      const [meResponse, electionsResponse] = await Promise.all([
        api.get('/auth/me'),
        api.get('/vote/elections/public')
      ]);

      const me = meResponse.data;
      const electionList = electionsResponse.data?.elections || [];

      setProfile(me);
      setElections(electionList);

      if (electionList.length > 0) {
        const liveElection = electionList.find((election) => election.status === 'live');
        const defaultElectionId = liveElection?._id || electionList[0]._id;

        setSelectedElectionId(defaultElectionId);
        setFormData((current) => ({
          ...current,
          electionId: defaultElectionId
        }));
      }
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        clearAuthSession();
        navigate('/login');
        return;
      }

      setError('Unable to load recount and dispute module right now.');
    } finally {
      setBootstrapping(false);
    }
  };

  useEffect(() => {
    bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadMyCases = async (electionId) => {
    setLoadingMyCases(true);

    try {
      const response = await api.get('/disputes/me', {
        params: electionId ? { electionId } : {}
      });

      setMyCases(response.data?.disputes || []);
      setMySummary(response.data?.summary || null);
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        clearAuthSession();
        navigate('/login');
        return;
      }

      toast.error(requestError.response?.data?.message || 'Could not load your dispute records.');
    } finally {
      setLoadingMyCases(false);
    }
  };

  const loadAdminCases = async (electionId) => {
    if (!isAdmin) {
      return;
    }

    setLoadingAdminCases(true);

    try {
      const response = await api.get('/disputes/manage', {
        params: {
          electionId: electionId || undefined,
          status: statusFilter,
          type: typeFilter
        }
      });

      setAdminCases(response.data?.disputes || []);
      setAdminSummary(response.data?.summary || null);
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        clearAuthSession();
        navigate('/login');
        return;
      }

      toast.error(requestError.response?.data?.message || 'Could not load admin dispute queue.');
    } finally {
      setLoadingAdminCases(false);
    }
  };

  const loadCandidates = async (electionId) => {
    if (!electionId) {
      setCandidateOptions([]);
      return;
    }

    setLoadingCandidates(true);

    try {
      const response = await api.get('/vote/candidates', {
        params: { electionId }
      });

      setCandidateOptions(response.data?.candidates || []);
    } catch {
      setCandidateOptions([]);
    } finally {
      setLoadingCandidates(false);
    }
  };

  useEffect(() => {
    if (bootstrapping) {
      return;
    }

    loadMyCases(selectedElectionId);
    loadCandidates(selectedElectionId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bootstrapping, selectedElectionId]);

  useEffect(() => {
    if (bootstrapping || !isAdmin) {
      return;
    }

    loadAdminCases(selectedElectionId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bootstrapping, isAdmin, selectedElectionId, statusFilter, typeFilter]);

  const onFormChange = (event) => {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value
    }));

    setError('');
  };

  const onSubmitCase = async (event) => {
    event.preventDefault();

    if (!formData.electionId) {
      setError('Select an election before filing a case.');
      return;
    }

    if (!formData.subject.trim() || formData.subject.trim().length < 8) {
      setError('Subject must be at least 8 characters.');
      return;
    }

    if (!formData.description.trim() || formData.description.trim().length < 20) {
      setError('Description must be at least 20 characters.');
      return;
    }

    if (formData.type === 'recount' && !formData.receiptCode.trim() && !formData.candidateId) {
      setError('Recount requests require a receipt code or candidate selection.');
      return;
    }

    setSubmittingCase(true);
    setError('');

    try {
      await api.post('/disputes', {
        electionId: formData.electionId,
        type: formData.type,
        subject: formData.subject.trim(),
        description: formData.description.trim(),
        receiptCode: formData.receiptCode.trim(),
        candidateId: formData.candidateId || ''
      });

      toast.success('Case submitted successfully.');

      setFormData((current) => ({
        ...defaultFormData,
        electionId: current.electionId,
        type: current.type
      }));

      await loadMyCases(selectedElectionId);

      if (isAdmin) {
        await loadAdminCases(selectedElectionId);
      }
    } catch (requestError) {
      const message = requestError.response?.data?.message || 'Failed to submit dispute case.';
      setError(message);
      toast.error(message);
    } finally {
      setSubmittingCase(false);
    }
  };

  const updateResolutionDraft = (disputeId, value) => {
    setResolutionDrafts((current) => ({
      ...current,
      [disputeId]: value
    }));
  };

  const onAdminStatusUpdate = async (disputeId, nextStatus) => {
    const disputeRecord = adminCases.find((entry) => entry._id === disputeId);
    const note = String(resolutionDrafts[disputeId] ?? disputeRecord?.resolutionNote ?? '').trim();

    if ((nextStatus === 'resolved' || nextStatus === 'rejected') && note.length < 10) {
      toast.error('Add at least 10 characters in resolution note for final updates.');
      return;
    }

    try {
      await api.patch(`/disputes/manage/${disputeId}/status`, {
        status: nextStatus,
        resolutionNote: note
      });

      toast.success(`Case marked as ${formatCaseStatus(nextStatus)}.`);
      await loadAdminCases(selectedElectionId);
      await loadMyCases(selectedElectionId);
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || 'Could not update case status.');
    }
  };

  return (
    <main className="min-h-screen page-shell pt-20 pb-14">
      <div className="section-wrap space-y-6">
        <header className="glass-panel p-6 md:p-7">
          <p className="eyebrow mb-4">
            <Gavel className="w-4 h-4" /> Recount and Dispute Module
          </p>
          <h1 className="text-2xl sm:text-3xl text-[#102347] mb-2">Election Case Management</h1>
          <p className="text-[#5e7398] max-w-3xl">
            File recount requests and integrity disputes in a separate workflow, then track case review and outcomes.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="metric-pill">Role: {profile?.role || '...'}</span>
            <span className="metric-pill">Election Cases: {(mySummary?.totalCases || 0) + (adminSummary?.totalCases || 0)}</span>
            <span className="metric-pill">Current Election: {selectedElection?.name || 'Not selected'}</span>
          </div>
        </header>

        {error && (
          <div className="surface-card p-4 border border-[#f1c6c6] bg-[#fff1f1] text-[#a43a3a] flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {bootstrapping ? (
          <section className="surface-card p-8 text-center">
            <LoaderCircle className="w-6 h-6 animate-spin text-[#1f66f4] mx-auto mb-2" />
            <p className="text-sm text-[#60759b]">Loading module...</p>
          </section>
        ) : (
          <>
            <section className="surface-card p-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="case-election" className="block text-xs uppercase tracking-[0.1em] text-[#5f7398] mb-2">
                    Election Scope
                  </label>
                  <ThemedSelect
                    id="case-election"
                    value={selectedElectionId}
                    onValueChange={(nextElectionId) => {
                      setSelectedElectionId(nextElectionId);
                      setFormData((current) => ({
                        ...current,
                        electionId: nextElectionId,
                        candidateId: ''
                      }));
                    }}
                    placeholder={elections.length === 0 ? 'No elections available' : 'Select election'}
                    options={elections.map((election) => ({
                      value: election._id,
                      label: election.name
                    }))}
                  />
                </div>

                {isAdmin && (
                  <>
                    <div>
                      <label htmlFor="admin-status-filter" className="block text-xs uppercase tracking-[0.1em] text-[#5f7398] mb-2">
                        Status Filter
                      </label>
                      <ThemedSelect
                        id="admin-status-filter"
                        value={statusFilter}
                        onValueChange={setStatusFilter}
                        options={STATUS_FILTER_OPTIONS}
                      />
                    </div>

                    <div>
                      <label htmlFor="admin-type-filter" className="block text-xs uppercase tracking-[0.1em] text-[#5f7398] mb-2">
                        Type Filter
                      </label>
                      <ThemedSelect
                        id="admin-type-filter"
                        value={typeFilter}
                        onValueChange={setTypeFilter}
                        options={TYPE_FILTER_OPTIONS}
                      />
                    </div>
                  </>
                )}
              </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-6">
              <section className="surface-card p-6">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <h2 className="text-xl text-[#102347]">File New Case</h2>
                  {loadingCandidates && <LoaderCircle className="w-4 h-4 animate-spin text-[#1f66f4]" />}
                </div>

                <form onSubmit={onSubmitCase} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="case-type" className="block text-xs uppercase tracking-[0.1em] text-[#5f7398] mb-2">
                        Case Type
                      </label>
                      <ThemedSelect
                        id="case-type"
                        name="type"
                        value={formData.type}
                        onChange={onFormChange}
                        options={DISPUTE_TYPE_OPTIONS}
                      />
                    </div>

                    <div>
                      <label htmlFor="case-candidate" className="block text-xs uppercase tracking-[0.1em] text-[#5f7398] mb-2">
                        Candidate (Optional)
                      </label>
                      <ThemedSelect
                        id="case-candidate"
                        name="candidateId"
                        value={formData.candidateId}
                        onChange={onFormChange}
                        options={[
                          { value: '', label: 'Select candidate' },
                          ...candidateOptions.map((candidate) => ({
                            value: candidate._id,
                            label: `${candidate.name} (${candidate.party})`
                          }))
                        ]}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="case-subject" className="block text-xs uppercase tracking-[0.1em] text-[#5f7398] mb-2">
                      Subject
                    </label>
                    <input
                      id="case-subject"
                      name="subject"
                      value={formData.subject}
                      onChange={onFormChange}
                      className="form-field"
                      placeholder="Example: Request recount for receipt mismatch"
                    />
                  </div>

                  <div>
                    <label htmlFor="case-receipt" className="block text-xs uppercase tracking-[0.1em] text-[#5f7398] mb-2">
                      Receipt Code (Optional)
                    </label>
                    <input
                      id="case-receipt"
                      name="receiptCode"
                      value={formData.receiptCode}
                      onChange={onFormChange}
                      className="form-field"
                      placeholder="CV-2026-AB12EF"
                    />
                  </div>

                  <div>
                    <label htmlFor="case-description" className="block text-xs uppercase tracking-[0.1em] text-[#5f7398] mb-2">
                      Description
                    </label>
                    <textarea
                      id="case-description"
                      name="description"
                      value={formData.description}
                      onChange={onFormChange}
                      className="form-field min-h-[120px]"
                      placeholder="Describe what happened, why recount or investigation is needed, and relevant timeline details."
                    />
                  </div>

                  {selectedCandidate && (
                    <div className="rounded-xl border border-[#d8e3f8] bg-[#f6f9ff] px-3 py-2 text-xs text-[#56709a]">
                      Candidate linked to this case: <span className="font-semibold text-[#14305f]">{selectedCandidate.name}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submittingCase}
                    className="btn-primary inline-flex items-center gap-2 disabled:opacity-60"
                  >
                    {submittingCase ? 'Submitting...' : 'Submit Case'}
                    {!submittingCase && <ShieldAlert className="w-4 h-4" />}
                  </button>
                </form>
              </section>

              <section className="glass-panel p-6">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <h2 className="text-xl text-[#102347]">My Cases</h2>
                  <button
                    type="button"
                    onClick={() => loadMyCases(selectedElectionId)}
                    className="text-xs rounded-full border border-[#bfd1f8] bg-[#eaf2ff] text-[#1f66f4] px-3 py-1.5 inline-flex items-center gap-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Refresh
                  </button>
                </div>

                {loadingMyCases ? (
                  <div className="text-center py-8">
                    <LoaderCircle className="w-6 h-6 animate-spin text-[#1f66f4] mx-auto mb-2" />
                    <p className="text-sm text-[#60759b]">Loading your cases...</p>
                  </div>
                ) : myCases.length === 0 ? (
                  <p className="text-sm text-[#60759b]">No case records found for the selected election.</p>
                ) : (
                  <div className="space-y-3 max-h-[520px] overflow-auto pr-1">
                    {myCases.map((item) => (
                      <article key={item._id} className="rounded-2xl border border-[#d5e1f5] bg-white p-4">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div>
                            <p className="text-sm font-semibold text-[#12305d]">{item.subject}</p>
                            <p className="text-xs text-[#60759a] mt-1">{item.electionName}</p>
                          </div>
                          <span className={`text-[11px] rounded-full border px-2.5 py-1 font-semibold ${getStatusPillClass(item.status)}`}>
                            {formatCaseStatus(item.status)}
                          </span>
                        </div>

                        <p className="text-xs text-[#4f6794] mb-2">{item.description}</p>

                        <div className="flex flex-wrap gap-2 text-[11px] text-[#60759b]">
                          <span className="rounded-full border border-[#d5e1f5] bg-[#f8fbff] px-2 py-1">Type: {formatCaseType(item.type)}</span>
                          {item.receiptCode && (
                            <span className="rounded-full border border-[#d5e1f5] bg-[#f8fbff] px-2 py-1">Receipt: {item.receiptCode}</span>
                          )}
                          <span className="rounded-full border border-[#d5e1f5] bg-[#f8fbff] px-2 py-1">Filed: {formatDateTime(item.createdAt)}</span>
                        </div>

                        {item.resolutionNote && (
                          <div className="mt-3 rounded-xl border border-[#d7e5ff] bg-[#f5f9ff] px-3 py-2">
                            <p className="text-[11px] uppercase tracking-[0.08em] text-[#5f7398] mb-1">Resolution Note</p>
                            <p className="text-xs text-[#4d6793]">{item.resolutionNote}</p>
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </div>

            {isAdmin && (
              <section className="surface-card p-6">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <h2 className="text-xl text-[#102347]">Admin Review Queue</h2>
                  <button
                    type="button"
                    onClick={() => loadAdminCases(selectedElectionId)}
                    className="text-xs rounded-full border border-[#bfd1f8] bg-[#eaf2ff] text-[#1f66f4] px-3 py-1.5 inline-flex items-center gap-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Refresh Queue
                  </button>
                </div>

                {loadingAdminCases ? (
                  <div className="text-center py-8">
                    <LoaderCircle className="w-6 h-6 animate-spin text-[#1f66f4] mx-auto mb-2" />
                    <p className="text-sm text-[#60759b]">Loading admin queue...</p>
                  </div>
                ) : adminCases.length === 0 ? (
                  <p className="text-sm text-[#60759b]">No dispute cases match the selected filters.</p>
                ) : (
                  <div className="space-y-4">
                    {adminCases.map((item) => (
                      <article key={item._id} className="rounded-2xl border border-[#d5e1f5] bg-white p-4">
                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3 mb-2">
                          <div>
                            <p className="text-sm font-semibold text-[#12305d]">{item.subject}</p>
                            <p className="text-xs text-[#60759a] mt-1">
                              {item.electionName} | Filed by {item.filedBy?.name || item.filedByName || 'Voter'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-[11px] rounded-full border px-2.5 py-1 font-semibold ${getStatusPillClass(item.status)}`}>
                              {formatCaseStatus(item.status)}
                            </span>
                            <span className="text-[11px] rounded-full border border-[#d5e1f5] bg-[#f8fbff] px-2.5 py-1 text-[#577199] font-semibold">
                              {formatCaseType(item.type)}
                            </span>
                          </div>
                        </div>

                        <p className="text-xs text-[#4f6794] mb-2">{item.description}</p>

                        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-start">
                          <textarea
                            value={resolutionDrafts[item._id] ?? item.resolutionNote ?? ''}
                            onChange={(event) => updateResolutionDraft(item._id, event.target.value)}
                            className="form-field min-h-[84px]"
                            placeholder="Add investigation findings or final resolution note"
                          />

                          <div className="flex flex-wrap md:flex-col gap-2">
                            <button
                              type="button"
                              onClick={() => onAdminStatusUpdate(item._id, 'under_review')}
                              className="text-xs rounded-full border border-[#d5e1f5] bg-[#f8fbff] text-[#35598e] px-3 py-1.5"
                            >
                              Mark Under Review
                            </button>
                            <button
                              type="button"
                              onClick={() => onAdminStatusUpdate(item._id, 'resolved')}
                              className="text-xs rounded-full border border-[#b9e5c6] bg-[#eefcf3] text-[#1f7d3f] px-3 py-1.5"
                            >
                              Resolve
                            </button>
                            <button
                              type="button"
                              onClick={() => onAdminStatusUpdate(item._id, 'rejected')}
                              className="text-xs rounded-full border border-[#efc7c7] bg-[#fff1f1] text-[#aa3d3d] px-3 py-1.5"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            )}

            {!isAdmin && (
              <section className="glass-panel p-6">
                <p className="eyebrow mb-3">
                  <ClipboardList className="w-4 h-4" /> Workflow Notes
                </p>
                <ul className="space-y-2.5 text-sm text-[#5b7096] leading-relaxed">
                  <li>Use Dispute for ballot integrity, eligibility, or system behavior issues.</li>
                  <li>Use Recount when tally confidence needs a candidate- or receipt-linked review.</li>
                  <li>Case statuses update from Open to Under Review, then Resolved or Rejected.</li>
                  <li>You can track final notes and actions in the My Cases panel.</li>
                </ul>

                <p className="text-xs text-[#60759a] mt-4 inline-flex items-center gap-2">
                  <BadgeCheck className="w-4 h-4" />
                  Case records are linked to election scope for transparent auditing.
                </p>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
};

export default RecountDisputes;
