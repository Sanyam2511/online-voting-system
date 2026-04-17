import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  LoaderCircle,
  ShieldCheck,
  Vote
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import PartyCard from '../components/PartyCard';
import api from '../lib/api';
import { clearAuthSession, patchStoredUser } from '../lib/auth';
import votingBallotIllustration from '../assets/illustrations/voting-ballot.svg';

const formatElectionStatus = (status) => {
  if (!status) {
    return 'Unknown';
  }

  const labelMap = {
    draft: 'Draft',
    registration: 'Registration',
    live: 'Voting Live',
    counting: 'Counting',
    audited: 'Audited',
    published: 'Published',
    archived: 'Archived'
  };

  return labelMap[status] || status;
};

const VotingArena = () => {
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [voterName, setVoterName] = useState('Citizen');
  const [hasVoted, setHasVoted] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [ballotLoading, setBallotLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [receipt, setReceipt] = useState(null);
  const [elections, setElections] = useState([]);
  const [selectedElectionId, setSelectedElectionId] = useState('');

  const selectedElection = useMemo(
    () => elections.find((election) => election._id === selectedElectionId) || null,
    [elections, selectedElectionId]
  );

  const groupedCandidates = useMemo(() => {
    return candidates.reduce((grouped, candidate) => {
      if (!grouped[candidate.party]) {
        grouped[candidate.party] = [];
      }

      grouped[candidate.party].push(candidate);
      return grouped;
    }, {});
  }, [candidates]);

  const receiptCode = receipt?.receiptCode || receipt?.code || '';
  const isElectionLive = selectedElection?.status === 'live';

  useEffect(() => {
    const bootstrapVotingData = async () => {
      const token = localStorage.getItem('token');

      if (!token) {
        navigate('/login');
        return;
      }

      try {
        const [electionsResponse, meResponse] = await Promise.all([
          api.get('/vote/elections/public'),
          api.get('/auth/me')
        ]);

        if (meResponse.data.role === 'Admin') {
          navigate('/manage-candidates');
          return;
        }

        const electionList = electionsResponse.data?.elections || [];
        setElections(electionList);
        setVoterName(meResponse.data.name || 'Citizen');

        if (electionList.length > 0) {
          const liveElection = electionList.find((election) => election.status === 'live');
          setSelectedElectionId(liveElection?._id || electionList[0]._id);
        }
      } catch (requestError) {
        if (requestError.response?.status === 401) {
          clearAuthSession();
          navigate('/login');
          return;
        }

        setError('Unable to load election data. Please refresh and try again.');
      } finally {
        setPageLoading(false);
      }
    };

    bootstrapVotingData();
  }, [navigate]);

  useEffect(() => {
    const fetchElectionBallot = async () => {
      if (!selectedElectionId) {
        setCandidates([]);
        setHasVoted(false);
        setReceipt(null);
        setSelectedCandidate(null);
        setAgreeToTerms(false);
        return;
      }

      setBallotLoading(true);
      setError('');
      setSuccess('');
      setSelectedCandidate(null);
      setAgreeToTerms(false);

      try {
        const candidatesResponse = await api.get('/vote/candidates', {
          params: { electionId: selectedElectionId }
        });

        setCandidates(candidatesResponse.data?.candidates || []);

        try {
          const receiptResponse = await api.get('/vote/receipt/me', {
            params: { electionId: selectedElectionId }
          });

          setReceipt(receiptResponse.data || null);
          setHasVoted(Boolean(receiptResponse.data));
        } catch (receiptError) {
          if (receiptError.response?.status === 401) {
            clearAuthSession();
            navigate('/login');
            return;
          }

          if (receiptError.response?.status === 404) {
            setReceipt(null);
            setHasVoted(false);
          } else {
            setReceipt(null);
            setHasVoted(false);
            setError('Unable to load receipt status for this election.');
          }
        }
      } catch (requestError) {
        if (requestError.response?.status === 401) {
          clearAuthSession();
          navigate('/login');
          return;
        }

        setCandidates([]);
        setReceipt(null);
        setHasVoted(false);
        setError('Unable to load ballot data for this election. Please try again.');
      } finally {
        setBallotLoading(false);
      }
    };

    if (!pageLoading) {
      fetchElectionBallot();
    }
  }, [navigate, pageLoading, selectedElectionId]);

  const handleSelectCandidate = (candidate) => {
    if (hasVoted || !isElectionLive) {
      return;
    }

    setSelectedCandidate(candidate);
    setError('');
  };

  const handleConfirmVote = async () => {
    if (!selectedElectionId) {
      setError('Select an election before voting.');
      return;
    }

    if (!isElectionLive) {
      setError('This election is not currently accepting votes.');
      return;
    }

    if (hasVoted) {
      setError('You have already cast your vote in this election.');
      return;
    }

    if (!agreeToTerms) {
      setError('Please confirm the voting terms to continue');
      return;
    }

    if (!selectedCandidate) {
      setError('Please select one candidate to continue');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.post('/vote/cast', {
        candidateId: selectedCandidate._id,
        electionId: selectedElectionId
      });

      setSuccess(response.data.message || 'Vote submitted successfully!');
      setHasVoted(true);
      setReceipt(response.data.receipt || null);
      patchStoredUser({ hasVoted: true });

      setCandidates((prevCandidates) =>
        prevCandidates.map((candidate) => {
          if (candidate._id !== selectedCandidate._id) {
            return candidate;
          }

          return {
            ...candidate,
            voteCount: Number(candidate.voteCount || 0) + 1
          };
        })
      );
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit vote. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen pt-28 pb-16">
      <div className="section-wrap">
        <header className="glass-panel p-8 sm:p-10 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
            <div>
              <p className="eyebrow mb-4">
                <Vote className="w-4 h-4" /> Official Ballot Arena
              </p>
              <h1 className="text-4xl sm:text-5xl text-[#102347] mb-2">Cast Your Vote</h1>
              <p className="text-[#5c7197]">Welcome, {voterName}. Select one candidate and confirm your ballot.</p>
            </div>

            <div className="rounded-2xl border border-[#cddaf5] bg-white px-5 py-4 min-w-[220px]">
              <p className="text-xs uppercase tracking-[0.12em] text-[#61769b] mb-2">Voting Status</p>
              <p className={`text-sm font-semibold ${hasVoted ? 'text-[#1f9c4c]' : 'text-[#17386f]'}`}>
                {hasVoted ? 'Vote already submitted' : 'Awaiting your vote'}
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-end">
            <div>
              <label htmlFor="election-picker" className="block text-xs uppercase tracking-[0.12em] text-[#5f7398] mb-2">
                Select Election
              </label>
              <select
                id="election-picker"
                value={selectedElectionId}
                onChange={(event) => setSelectedElectionId(event.target.value)}
                className="form-field"
                disabled={pageLoading || ballotLoading || elections.length === 0}
              >
                {elections.length === 0 ? (
                  <option value="">No elections available</option>
                ) : (
                  elections.map((election) => (
                    <option key={election._id} value={election._id}>
                      {election.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            {selectedElection && (
              <div className="rounded-2xl border border-[#d2def6] bg-white px-4 py-3">
                <p className="text-xs text-[#60739a] inline-flex items-center gap-2">
                  <CalendarDays className="w-4 h-4" /> {formatElectionStatus(selectedElection.status)}
                </p>
              </div>
            )}
          </div>
        </header>

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-[#fff1f1] border border-[#f1c6c6] flex gap-3">
            <AlertCircle className="w-5 h-5 text-[#c73939] flex-shrink-0 mt-0.5" />
            <p className="text-sm text-[#a62f2f]">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 rounded-2xl bg-[#eefcf3] border border-[#bde8cc] flex gap-3">
            <CheckCircle2 className="w-5 h-5 text-[#1f9c4c] flex-shrink-0 mt-0.5" />
            <p className="text-sm text-[#1b7a3d]">{success}</p>
          </div>
        )}

        {pageLoading ? (
          <div className="surface-card p-10 text-center">
            <LoaderCircle className="w-7 h-7 animate-spin text-[#1f66f4] mx-auto mb-3" />
            <p className="text-[#4e6692]">Loading official ballot data...</p>
          </div>
        ) : elections.length === 0 ? (
          <div className="surface-card p-8">
            <h2 className="text-2xl text-[#102347] mb-2">No election is available</h2>
            <p className="text-[#5e7398]">Admin can create an election first, then voting will be enabled.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
            <section>
              {ballotLoading ? (
                <div className="surface-card p-10 text-center">
                  <LoaderCircle className="w-7 h-7 animate-spin text-[#1f66f4] mx-auto mb-3" />
                  <p className="text-[#4e6692]">Loading selected election ballot...</p>
                </div>
              ) : Object.keys(groupedCandidates).length === 0 ? (
                <div className="surface-card p-8">
                  <h2 className="text-2xl text-[#102347] mb-2">No candidates available</h2>
                  <p className="text-[#5e7398]">Candidates have not been configured for this election yet.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(groupedCandidates).map(([partyName, partyCandidates]) => (
                    <PartyCard
                      key={partyName}
                      partyName={partyName}
                      candidates={partyCandidates}
                      selectedCandidateId={selectedCandidate?._id}
                      onSelectCandidate={handleSelectCandidate}
                      disabled={hasVoted || loading || !isElectionLive}
                    />
                  ))}
                </div>
              )}
            </section>

            <aside className="glass-panel p-6 h-fit lg:sticky lg:top-28">
              <p className="text-xs uppercase tracking-[0.12em] text-[#60739a] mb-3">Vote Summary</p>

              <div className="rounded-2xl border border-[#cad8f3] bg-white overflow-hidden mb-4 shadow-sm">
                <img
                  src={votingBallotIllustration}
                  alt="Digital ballot and secure vote confirmation"
                  className="w-full h-40 object-cover"
                  loading="lazy"
                />
              </div>

              {selectedElection && (
                <div className="rounded-2xl border border-[#cad8f3] bg-white p-4 mb-4">
                  <p className="text-sm text-[#5f7298] mb-1">Election</p>
                  <p className="font-semibold text-[#122f5d]">{selectedElection.name}</p>
                  <p className="text-xs text-[#4f6590] mt-1">Status: {formatElectionStatus(selectedElection.status)}</p>
                </div>
              )}

              {selectedCandidate ? (
                <div className="rounded-2xl border border-[#cad8f3] bg-white p-4 mb-4">
                  <p className="text-sm text-[#5f7298] mb-1">Selected Candidate</p>
                  <p className="font-semibold text-[#122f5d]">{selectedCandidate.name}</p>
                  <p className="text-sm text-[#4f6590]">{selectedCandidate.party}</p>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-[#bfd1f8] bg-[#f8fbff] p-4 mb-4">
                  <p className="text-sm text-[#5e7196]">No candidate selected yet.</p>
                </div>
              )}

              <div className="rounded-2xl border border-[#d2def6] bg-white p-4 mb-5">
                <p className="text-sm text-[#4f6691] leading-relaxed">
                  One account can cast only one vote per election. Review your selection carefully before submitting.
                </p>
              </div>

              <label className="flex items-start gap-3 mb-5">
                <input
                  type="checkbox"
                  checked={agreeToTerms}
                  onChange={(event) => setAgreeToTerms(event.target.checked)}
                  disabled={hasVoted || loading || !isElectionLive}
                  className="mt-1 h-4 w-4 rounded border-[#abc1eb]"
                />
                <span className="text-sm text-[#56709a]">
                  I confirm this vote is my independent and final decision.
                </span>
              </label>

              <button
                type="button"
                onClick={handleConfirmVote}
                disabled={loading || hasVoted || !selectedCandidate || !agreeToTerms || !isElectionLive}
                className="btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading
                  ? 'Submitting vote...'
                  : hasVoted
                    ? 'Vote Already Submitted'
                    : !isElectionLive
                      ? 'Election Not Live'
                      : 'Confirm Vote'}
              </button>

              <p className="text-xs text-[#60739a] mt-4 inline-flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 mt-0.5" />
                Submission is protected by authenticated session and single-vote enforcement.
              </p>

              {hasVoted && (
                <div className="mt-3">
                  <p className="text-xs text-[#1f9c4c] inline-flex items-center gap-2">
                    <BadgeCheck className="w-4 h-4" />
                    Your vote has been successfully recorded.
                  </p>

                  {receipt && (
                    <div className="mt-3 rounded-2xl border border-[#bcd0f5] bg-[#f4f8ff] p-4">
                      <p className="text-xs uppercase tracking-[0.1em] text-[#5f7398] mb-1">Vote Receipt</p>
                      <p className="text-sm font-semibold text-[#1f66f4] break-all">{receiptCode}</p>
                      <p className="text-xs text-[#56709a] mt-2">Status: {receipt.status}</p>
                      <Link
                        to={`/receipt?code=${encodeURIComponent(receiptCode)}&electionId=${encodeURIComponent(selectedElectionId)}`}
                        className="btn-secondary mt-3 !py-2 !px-4 text-xs inline-flex"
                      >
                        Verify This Receipt
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </aside>
          </div>
        )}
      </div>
    </main>
  );
};

export default VotingArena;
