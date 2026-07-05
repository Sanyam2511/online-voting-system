import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  KeyRound,
  LoaderCircle,
  ShieldCheck,
  Vote
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import PartyCard from '../components/PartyCard';
import ThemedSelect from '../components/ThemedSelect';
import api from '../lib/api';
import { clearAuthSession, patchStoredUser } from '../lib/auth';
import { formatElectionStatus } from '../lib/formatting';
import votingBallotIllustration from '../assets/illustrations/voting-ballot.svg';
import { useUiPreferences } from '../context/useUiPreferences';

const VotingArena = () => {
  const navigate = useNavigate();
  const { t, withLanguagePath, accessibilityMode } = useUiPreferences();
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [voterName, setVoterName] = useState(t('vote.defaultVoter', 'Citizen'));
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
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationToken, setVerificationToken] = useState('');
  const [verificationMessage, setVerificationMessage] = useState('');
  const [verificationError, setVerificationError] = useState('');
  const [verificationPreviewCode, setVerificationPreviewCode] = useState('');
  const [verificationExpiresAt, setVerificationExpiresAt] = useState('');
  const [requestingVerificationCode, setRequestingVerificationCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const stepFocusRef = useRef(null);

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

  const accessibilitySteps = useMemo(() => ([
    { key: 'election', title: t('vote.accessibility.stepElection', 'Choose election') },
    { key: 'candidate', title: t('vote.accessibility.stepCandidate', 'Select candidate') },
    { key: 'verification', title: t('vote.accessibility.stepVerification', 'Verify identity') },
    { key: 'review', title: t('vote.accessibility.stepReview', 'Review & submit') }
  ]), [t]);

  const lastStepIndex = accessibilitySteps.length - 1;
  const activeStep = accessibilitySteps[activeStepIndex] || accessibilitySteps[0];

  const stepHints = useMemo(() => ({
    election: t('vote.accessibility.instructions', 'Use Tab to move between fields and buttons. Press Enter or Space to activate.'),
    candidate: t('vote.accessibility.candidateHint', 'Choose one candidate. Use Tab to move through the options.'),
    verification: t('vote.accessibility.verificationHint', 'Request a 6-digit code and verify it to unlock submission.'),
    review: t('vote.accessibility.reviewHint', 'Review your selection and confirm the voting terms before submitting.')
  }), [t]);

  const highestAvailableStep = useMemo(() => {
    if (hasVoted) {
      return lastStepIndex;
    }

    if (!selectedElectionId) {
      return 0;
    }

    if (!selectedCandidate) {
      return 1;
    }

    if (!verificationToken) {
      return 2;
    }

    return lastStepIndex;
  }, [hasVoted, lastStepIndex, selectedCandidate, selectedElectionId, verificationToken]);

  const stepStatusText = useMemo(() => {
    return t('vote.accessibility.stepStatus', 'Step {current} of {total}')
      .replace('{current}', String(activeStepIndex + 1))
      .replace('{total}', String(accessibilitySteps.length));
  }, [accessibilitySteps.length, activeStepIndex, t]);

  const stepHint = stepHints[activeStep?.key] || stepHints.election;
  const stepHintId = `vote-step-hint-${activeStep?.key || 'election'}`;

  const canGoNext = activeStepIndex < highestAvailableStep;
  const canGoBack = activeStepIndex > 0;

  useEffect(() => {
    const bootstrapVotingData = async () => {
      const token = localStorage.getItem('token');

      if (!token) {
        navigate(withLanguagePath('/login'));
        return;
      }

      try {
        const [electionsResponse, meResponse] = await Promise.all([
          api.get('/vote/elections/public'),
          api.get('/auth/me')
        ]);

        if (meResponse.data.role === 'Admin') {
          navigate(withLanguagePath('/manage-candidates'));
          return;
        }

        const electionList = electionsResponse.data?.elections || [];
        setElections(electionList);
        setVoterName(meResponse.data.name || t('vote.defaultVoter', 'Citizen'));

        if (electionList.length > 0) {
          const liveElection = electionList.find((election) => election.status === 'live');
          setSelectedElectionId(liveElection?._id || electionList[0]._id);
        }
      } catch (requestError) {
        if (requestError.response?.status === 401) {
          clearAuthSession();
          navigate(withLanguagePath('/login'));
          return;
        }

        setError(t('vote.errors.loadElections', 'Unable to load election data. Please refresh and try again.'));
      } finally {
        setPageLoading(false);
      }
    };

    bootstrapVotingData();
  }, [navigate, t, withLanguagePath]);

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
      setVerificationCode('');
      setVerificationToken('');
      setVerificationMessage('');
      setVerificationError('');
      setVerificationPreviewCode('');
      setVerificationExpiresAt('');

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
            navigate(withLanguagePath('/login'));
            return;
          }

          if (receiptError.response?.status === 404) {
            setReceipt(null);
            setHasVoted(false);
          } else {
            setReceipt(null);
            setHasVoted(false);
            setError(t('vote.errors.loadReceipt', 'Unable to load receipt status for this election.'));
          }
        }
      } catch (requestError) {
        if (requestError.response?.status === 401) {
          clearAuthSession();
          navigate(withLanguagePath('/login'));
          return;
        }

        setCandidates([]);
        setReceipt(null);
        setHasVoted(false);
        setError(t('vote.errors.loadBallot', 'Unable to load ballot data for this election. Please try again.'));
      } finally {
        setBallotLoading(false);
      }
    };

    if (!pageLoading) {
      fetchElectionBallot();
    }
  }, [navigate, pageLoading, selectedElectionId, t, withLanguagePath]);

  useEffect(() => {
    if (!accessibilityMode) {
      return;
    }

    if (hasVoted) {
      setActiveStepIndex(lastStepIndex);
      return;
    }

    if (!selectedElectionId) {
      setActiveStepIndex(0);
      return;
    }

    if (!selectedCandidate) {
      setActiveStepIndex(1);
      return;
    }

    if (!verificationToken) {
      setActiveStepIndex(2);
      return;
    }

    setActiveStepIndex(lastStepIndex);
  }, [accessibilityMode, hasVoted, lastStepIndex, selectedCandidate, selectedElectionId, verificationToken]);

  useEffect(() => {
    if (!accessibilityMode || pageLoading) {
      return;
    }

    const node = stepFocusRef.current;
    if (node) {
      node.focus();
    }
  }, [accessibilityMode, activeStepIndex, pageLoading]);

  const handleStepChange = (index) => {
    if (index <= highestAvailableStep) {
      setActiveStepIndex(index);
    }
  };

  const handleNextStep = () => {
    if (!canGoNext) {
      return;
    }

    setActiveStepIndex((current) => Math.min(current + 1, highestAvailableStep));
  };

  const handlePreviousStep = () => {
    if (!canGoBack) {
      return;
    }

    setActiveStepIndex((current) => Math.max(current - 1, 0));
  };

  const handleSelectCandidate = (candidate) => {
    if (hasVoted || !isElectionLive) {
      return;
    }

    setSelectedCandidate(candidate);
    setError('');
  };

  const requestStrongVerificationCode = async () => {
    if (!selectedElectionId) {
      setVerificationError(t('vote.errors.selectElectionForCode', 'Select an election before requesting verification code.'));
      return;
    }

    if (!isElectionLive) {
      setVerificationError(t('vote.errors.verificationNotLive', 'Verification is available only while election status is live.'));
      return;
    }

    if (hasVoted) {
      setVerificationError(t('vote.errors.alreadyVoted', 'Vote is already cast for this election.'));
      return;
    }

    setRequestingVerificationCode(true);
    setVerificationError('');

    try {
      const response = await api.post('/auth/vote-verification/request', {
        electionId: selectedElectionId
      });

      setVerificationToken('');
      setVerificationMessage(response.data?.message || t('vote.verification.requested', 'Verification code requested successfully.'));
      setVerificationPreviewCode(response.data?.verificationCodePreview || '');
      setVerificationExpiresAt(response.data?.expiresAt || '');
    } catch (requestError) {
      setVerificationError(requestError.response?.data?.message || t('vote.errors.requestCodeFailed', 'Could not request verification code.'));
    } finally {
      setRequestingVerificationCode(false);
    }
  };

  const verifyStrongCode = async () => {
    const normalizedCode = verificationCode.trim();

    if (!/^\d{6}$/.test(normalizedCode)) {
      setVerificationError(t('vote.errors.invalidCode', 'Enter a valid 6-digit verification code.'));
      return;
    }

    setVerifyingCode(true);
    setVerificationError('');

    try {
      const response = await api.post('/auth/vote-verification/verify', {
        electionId: selectedElectionId,
        code: normalizedCode
      });

      setVerificationToken(response.data?.verificationToken || '');
      setVerificationMessage(response.data?.message || t('vote.verification.success', 'Verification completed. You can now cast your vote.'));
    } catch (requestError) {
      setVerificationToken('');
      setVerificationError(requestError.response?.data?.message || t('vote.errors.verifyFailed', 'Code verification failed.'));
    } finally {
      setVerifyingCode(false);
    }
  };

  const handleConfirmVote = async () => {
    if (!selectedElectionId) {
      setError(t('vote.errors.selectElection', 'Select an election before voting.'));
      return;
    }

    if (!isElectionLive) {
      setError(t('vote.errors.notLive', 'This election is not currently accepting votes.'));
      return;
    }

    if (hasVoted) {
      setError(t('vote.errors.alreadyVoted', 'You have already cast your vote in this election.'));
      return;
    }

    if (!agreeToTerms) {
      setError(t('vote.errors.confirmTerms', 'Please confirm the voting terms to continue'));
      return;
    }

    if (!selectedCandidate) {
      setError(t('vote.errors.selectCandidate', 'Please select one candidate to continue'));
      return;
    }

    if (!verificationToken) {
      setError(t('vote.errors.completeVerification', 'Complete strong voter verification before submitting your vote.'));
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.post('/vote/cast', {
        candidateId: selectedCandidate._id,
        electionId: selectedElectionId,
        verificationToken
      });

      setSuccess(response.data?.message || t('vote.success', 'Vote submitted successfully!'));
      setReceipt(response.data?.receipt || null);
      setHasVoted(true);
      setVerificationToken('');

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
      const message = err.response?.data?.message || t('vote.errors.submitFailed', 'Failed to submit vote. Please try again.');
      setError(message);

      if (message.toLowerCase().includes('verification')) {
        setVerificationToken('');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen page-shell pt-20 pb-14">
      <div className="section-wrap">
        <header className="glass-panel p-6 sm:p-7 mb-7">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
            <div>
              <p className="eyebrow mb-4">
                <Vote className="w-4 h-4" /> {t('vote.eyebrow', 'Official Ballot Arena')}
              </p>
              <h1 className="text-2xl sm:text-3xl text-[#102347] mb-2">{t('vote.title', 'Cast Your Vote')}</h1>
              <p className="text-[#5c7197]">{t('vote.welcome', 'Welcome')}, {voterName}. {t('vote.subtitle', 'Select one candidate and confirm your ballot.')}</p>
              {accessibilityMode && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="metric-pill">{t('vote.accessibility.badge', 'Accessibility mode enabled')}</span>
                </div>
              )}
            </div>

            <div className="border-b border-[#cddaf5] pb-3 min-w-[220px]">
              <p className="text-xs uppercase tracking-[0.12em] text-[#61769b] mb-2">{t('vote.statusTitle', 'Voting Status')}</p>
              <p className={`text-sm font-semibold ${hasVoted ? 'text-[#1f9c4c]' : 'text-[#17386f]'}`}>
                {hasVoted ? t('vote.status.submitted', 'Vote already submitted') : t('vote.status.awaiting', 'Awaiting your vote')}
              </p>
            </div>
          </div>

          {!accessibilityMode && (
            <>
              <div className="mt-5 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-end">
                <div>
                  <label htmlFor="election-picker" className="block text-xs uppercase tracking-[0.12em] text-[#5f7398] mb-2">
                    {t('vote.selectElection', 'Select Election')}
                  </label>
                  <ThemedSelect
                    id="election-picker"
                    value={selectedElectionId}
                    onValueChange={setSelectedElectionId}
                    disabled={pageLoading || ballotLoading || elections.length === 0}
                    placeholder={elections.length === 0 ? t('vote.noElections', 'No elections available') : t('vote.selectElectionPlaceholder', 'Select election')}
                    options={elections.map((election) => ({
                      value: election._id,
                      label: election.name
                    }))}
                  />
                </div>

                {selectedElection && (
                  <div className="border-b border-[#d2def6] pb-3">
                    <p className="text-xs text-[#60739a] inline-flex items-center gap-2">
                      <CalendarDays className="w-4 h-4" /> {formatElectionStatus(selectedElection.status, t)}
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="metric-pill">{t('vote.metric.candidates', 'Candidates')}: {candidates.length}</span>
                <span className="metric-pill">{t('vote.metric.votes', 'Election Votes')}: {selectedElection?.totalVotesCast || 0}</span>
                <span className="metric-pill">{t('vote.metric.electionCandidates', 'Election Candidates')}: {selectedElection?.totalCandidates || 0}</span>
              </div>
            </>
          )}
        </header>

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-[#fff1f1] border border-[#f1c6c6] flex gap-3" role="alert" aria-live="assertive">
            <AlertCircle className="w-5 h-5 text-[#c73939] flex-shrink-0 mt-0.5" />
            <p className="text-sm text-[#a62f2f]">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 rounded-2xl bg-[#eefcf3] border border-[#bde8cc] flex gap-3" role="status" aria-live="polite">
            <CheckCircle2 className="w-5 h-5 text-[#1f9c4c] flex-shrink-0 mt-0.5" />
            <p className="text-sm text-[#1b7a3d]">{success}</p>
          </div>
        )}

        {pageLoading ? (
          <div className="surface-card p-10 text-center">
            <LoaderCircle className="w-7 h-7 animate-spin text-[#1f66f4] mx-auto mb-3" />
            <p className="text-[#4e6692]">{t('vote.loading', 'Loading official ballot data...')}</p>
          </div>
        ) : elections.length === 0 ? (
          <div className="surface-card p-8">
            <h2 className="text-2xl text-[#102347] mb-2">{t('vote.noElectionTitle', 'No election is available')}</h2>
            <p className="text-[#5e7398]">{t('vote.noElectionBody', 'Admin can create an election first, then voting will be enabled.')}</p>
          </div>
        ) : accessibilityMode ? (
          <div className="space-y-6">
            <section className="surface-card p-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.12em] text-[#5f7398] mb-2">
                    {t('vote.accessibility.stepperLabel', 'Voting steps')}
                  </p>
                  <p className="text-sm text-[#5f7398]">
                    {t('vote.accessibility.instructions', 'Use Tab to move between fields and buttons. Press Enter or Space to activate.')}
                  </p>
                </div>
                <span className="metric-pill">{stepStatusText}</span>
              </div>

              <nav aria-label={t('vote.accessibility.stepperLabel', 'Voting steps')} className="mt-4">
                <div className="flex flex-wrap gap-2">
                  {accessibilitySteps.map((step, index) => {
                    const isActive = index === activeStepIndex;
                    const isComplete = index < activeStepIndex;

                    return (
                      <button
                        type="button"
                        key={step.key}
                        onClick={() => handleStepChange(index)}
                        className={`step-pill ${isActive ? 'step-pill-active' : isComplete ? 'step-pill-complete' : ''}`}
                        aria-current={isActive ? 'step' : undefined}
                        disabled={index > highestAvailableStep}
                      >
                        {step.title}
                      </button>
                    );
                  })}
                </div>
              </nav>
              <p id="vote-step-status" className="sr-only" aria-live="polite">{stepStatusText}</p>
            </section>

            <section
              ref={stepFocusRef}
              tabIndex="-1"
              className="surface-card p-6"
              aria-labelledby="vote-step-title"
              aria-describedby={`${stepHintId} vote-step-status`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <h2 id="vote-step-title" className="text-2xl text-[#102347]">{activeStep?.title}</h2>
                <span className="text-xs uppercase tracking-[0.12em] text-[#60739a]">{stepStatusText}</span>
              </div>
              <p id={stepHintId} className="text-sm text-[#5f7398] mb-4">{stepHint}</p>

              {activeStep?.key === 'election' && (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="election-picker-accessible" className="block text-xs uppercase tracking-[0.12em] text-[#5f7398] mb-2">
                      {t('vote.selectElection', 'Select Election')}
                    </label>
                    <ThemedSelect
                      id="election-picker-accessible"
                      value={selectedElectionId}
                      onValueChange={setSelectedElectionId}
                      ariaDescribedBy={stepHintId}
                      disabled={pageLoading || ballotLoading || elections.length === 0}
                      placeholder={elections.length === 0 ? t('vote.noElections', 'No elections available') : t('vote.selectElectionPlaceholder', 'Select election')}
                      options={elections.map((election) => ({
                        value: election._id,
                        label: election.name
                      }))}
                    />
                  </div>

                  {selectedElection && (
                    <div className="rounded-2xl border border-[#d2def6] bg-white px-4 py-3">
                      <p className="text-xs text-[#60739a] inline-flex items-center gap-2">
                        <CalendarDays className="w-4 h-4" /> {formatElectionStatus(selectedElection.status, t)}
                      </p>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <span className="metric-pill">{t('vote.metric.candidates', 'Candidates')}: {candidates.length}</span>
                    <span className="metric-pill">{t('vote.metric.votes', 'Election Votes')}: {selectedElection?.totalVotesCast || 0}</span>
                    <span className="metric-pill">{t('vote.metric.electionCandidates', 'Election Candidates')}: {selectedElection?.totalCandidates || 0}</span>
                  </div>
                </div>
              )}

              {activeStep?.key === 'candidate' && (
                <div className="space-y-6">
                  {ballotLoading ? (
                    <div className="surface-card p-10 text-center">
                      <LoaderCircle className="w-7 h-7 animate-spin text-[#1f66f4] mx-auto mb-3" />
                      <p className="text-[#4e6692]">{t('vote.loadingBallot', 'Loading selected election ballot...')}</p>
                    </div>
                  ) : Object.keys(groupedCandidates).length === 0 ? (
                    <div className="surface-card p-8">
                      <h2 className="text-2xl text-[#102347] mb-2">{t('vote.noCandidatesTitle', 'No candidates available')}</h2>
                      <p className="text-[#5e7398]">{t('vote.noCandidatesBody', 'Candidates have not been configured for this election yet.')}</p>
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
                </div>
              )}

              {activeStep?.key === 'verification' && (
                <div className="space-y-4">
                  <div className="border-b border-[#d2def6] pb-4">
                    <p className="text-xs uppercase tracking-[0.1em] text-[#5f7398] mb-2 inline-flex items-center gap-2">
                      <KeyRound className="w-3.5 h-3.5" /> {t('vote.verification.title', 'Strong Voter Verification')}
                    </p>
                    <p className="text-xs text-[#597099] leading-relaxed mb-3">
                      {t('vote.verification.body', 'Request a one-time 6-digit code, verify it, then submit your ballot.')}
                    </p>

                    <div className="flex flex-wrap gap-2 mb-3">
                      <button
                        type="button"
                        onClick={requestStrongVerificationCode}
                        disabled={requestingVerificationCode || hasVoted || !isElectionLive}
                        className="text-xs rounded-full border border-[#bfd1f8] bg-[#eaf2ff] text-[#1f66f4] px-3 py-1.5 font-semibold disabled:opacity-60"
                      >
                        {requestingVerificationCode ? t('vote.verification.requesting', 'Requesting...') : t('vote.verification.request', 'Request Code')}
                      </button>

                      <input
                        type="text"
                        value={verificationCode}
                        onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                        className="form-field !py-1.5 !px-3 max-w-[150px]"
                        placeholder={t('vote.verification.placeholder', '6-digit code')}
                        disabled={hasVoted || !isElectionLive}
                      />

                      <button
                        type="button"
                        onClick={verifyStrongCode}
                        disabled={verifyingCode || hasVoted || !isElectionLive}
                        className="text-xs rounded-full border border-[#bfd1f8] bg-white text-[#35598e] px-3 py-1.5 font-semibold disabled:opacity-60"
                      >
                        {verifyingCode ? t('vote.verification.verifying', 'Verifying...') : t('vote.verification.verify', 'Verify Code')}
                      </button>
                    </div>

                    {verificationPreviewCode && (
                      <p className="text-xs text-[#5e7398] mb-2">
                        {t('vote.verification.preview', 'Dev preview code')}: <span className="font-semibold text-[#1f66f4]">{verificationPreviewCode}</span>
                      </p>
                    )}

                    {verificationExpiresAt && (
                      <p className="text-[11px] text-[#6b7fa6] mb-2">
                        {t('vote.verification.expires', 'Code expires at')}: {new Date(verificationExpiresAt).toLocaleTimeString()}
                      </p>
                    )}

                    {verificationMessage && !verificationError && (
                      <p className="text-xs text-[#1f7d3f]" role="status" aria-live="polite">{verificationMessage}</p>
                    )}

                    {verificationError && (
                      <p className="text-xs text-[#a43a3a]" role="alert" aria-live="assertive">{verificationError}</p>
                    )}

                    {verificationToken && (
                      <p className="text-xs text-[#1f66f4] mt-2 font-semibold">{t('vote.verification.active', 'Verification active for this election.')}</p>
                    )}
                  </div>
                </div>
              )}

              {activeStep?.key === 'review' && (
                <div className="space-y-4">
                  {selectedElection && (
                    <div className="border-b border-[#cad8f3] pb-3">
                      <p className="text-sm text-[#5f7298] mb-1">{t('vote.summary.election', 'Election')}</p>
                      <p className="font-semibold text-[#122f5d]">{selectedElection.name}</p>
                      <p className="text-xs text-[#4f6590] mt-1">{t('vote.statusLabel', 'Status')}: {formatElectionStatus(selectedElection.status, t)}</p>
                    </div>
                  )}

                  {selectedCandidate ? (
                    <div className="border-b border-[#cad8f3] pb-3">
                      <p className="text-sm text-[#5f7298] mb-1">{t('vote.summary.selectedCandidate', 'Selected Candidate')}</p>
                      <p className="font-semibold text-[#122f5d]">{selectedCandidate.name}</p>
                      <p className="text-sm text-[#4f6590]">{selectedCandidate.party}</p>
                    </div>
                  ) : (
                    <div className="border-b border-dashed border-[#bfd1f8] pb-3">
                      <p className="text-sm text-[#5e7196]">{t('vote.summary.noneSelected', 'No candidate selected yet.')}</p>
                    </div>
                  )}

                  <div className="border-b border-[#d2def6] pb-3">
                    <p className="text-sm text-[#4f6691] leading-relaxed">
                      {t('vote.summary.oneVote', 'One account can cast only one vote per election. Review your selection carefully before submitting.')}
                    </p>
                  </div>

                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={agreeToTerms}
                      onChange={(event) => setAgreeToTerms(event.target.checked)}
                      disabled={hasVoted || loading || !isElectionLive}
                      className="mt-1 h-4 w-4 rounded border-[#abc1eb]"
                    />
                    <span className="text-sm text-[#56709a]">
                      {t('vote.terms', 'I confirm this vote is my independent and final decision.')}
                    </span>
                  </label>

                  <button
                    type="button"
                    onClick={handleConfirmVote}
                    disabled={loading || hasVoted || !selectedCandidate || !agreeToTerms || !isElectionLive || !verificationToken}
                    className="btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {loading
                      ? t('vote.cta.submitting', 'Submitting vote...')
                      : hasVoted
                        ? t('vote.cta.submitted', 'Vote Already Submitted')
                        : !isElectionLive
                          ? t('vote.cta.notLive', 'Election Not Live')
                          : !verificationToken
                            ? t('vote.cta.completeVerification', 'Complete Verification First')
                            : t('vote.cta.confirm', 'Confirm Vote')}
                  </button>

                  <p className="text-xs text-[#60739a] inline-flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 mt-0.5" />
                    {t('vote.footerNote', 'Submission is protected by authenticated session and single-vote enforcement.')}
                  </p>

                  {hasVoted && (
                    <div>
                      <p className="text-xs text-[#1f9c4c] inline-flex items-center gap-2">
                        <BadgeCheck className="w-4 h-4" />
                        {t('vote.recorded', 'Your vote has been successfully recorded.')}
                      </p>

                      {receipt && (
                        <div className="mt-3 border-t border-[#bcd0f5] pt-3">
                          <p className="text-xs uppercase tracking-[0.1em] text-[#5f7398] mb-1">{t('vote.receipt.title', 'Vote Receipt')}</p>
                          <p className="text-sm font-semibold text-[#1f66f4] break-all">{receiptCode}</p>
                          <p className="text-xs text-[#56709a] mt-2">{t('vote.statusLabel', 'Status')}: {receipt.status}</p>
                          <Link
                            to={withLanguagePath(`/receipt?code=${encodeURIComponent(receiptCode)}&electionId=${encodeURIComponent(selectedElectionId)}`)}
                            className="btn-secondary mt-3 !py-2 !px-4 text-xs inline-flex"
                          >
                            {t('vote.receipt.verify', 'Verify This Receipt')}
                          </Link>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </section>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={handlePreviousStep}
                disabled={!canGoBack}
                className="btn-secondary"
              >
                {t('vote.accessibility.back', 'Back')}
              </button>

              {activeStepIndex < lastStepIndex && (
                <button
                  type="button"
                  onClick={handleNextStep}
                  disabled={!canGoNext}
                  className="btn-primary"
                >
                  {t('vote.accessibility.next', 'Continue')}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
            <section>
              {ballotLoading ? (
                <div className="surface-card p-10 text-center">
                  <LoaderCircle className="w-7 h-7 animate-spin text-[#1f66f4] mx-auto mb-3" />
                  <p className="text-[#4e6692]">{t('vote.loadingBallot', 'Loading selected election ballot...')}</p>
                </div>
              ) : Object.keys(groupedCandidates).length === 0 ? (
                <div className="surface-card p-8">
                  <h2 className="text-2xl text-[#102347] mb-2">{t('vote.noCandidatesTitle', 'No candidates available')}</h2>
                  <p className="text-[#5e7398]">{t('vote.noCandidatesBody', 'Candidates have not been configured for this election yet.')}</p>
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
              <p className="text-xs uppercase tracking-[0.12em] text-[#60739a] mb-3">{t('vote.summary.title', 'Vote Summary')}</p>

              <div className="rounded-2xl overflow-hidden mb-4 shadow-sm">
                <img
                  src={votingBallotIllustration}
                  alt={t('vote.summary.imageAlt', 'Digital ballot and secure vote confirmation')}
                  className="w-full h-40 object-cover"
                  loading="lazy"
                />
              </div>

              {selectedElection && (
                <div className="border-b border-[#cad8f3] pb-3 mb-4">
                  <p className="text-sm text-[#5f7298] mb-1">{t('vote.summary.election', 'Election')}</p>
                  <p className="font-semibold text-[#122f5d]">{selectedElection.name}</p>
                  <p className="text-xs text-[#4f6590] mt-1">{t('vote.statusLabel', 'Status')}: {formatElectionStatus(selectedElection.status, t)}</p>
                </div>
              )}

              {selectedCandidate ? (
                <div className="border-b border-[#cad8f3] pb-3 mb-4">
                  <p className="text-sm text-[#5f7298] mb-1">{t('vote.summary.selectedCandidate', 'Selected Candidate')}</p>
                  <p className="font-semibold text-[#122f5d]">{selectedCandidate.name}</p>
                  <p className="text-sm text-[#4f6590]">{selectedCandidate.party}</p>
                </div>
              ) : (
                <div className="border-b border-dashed border-[#bfd1f8] pb-3 mb-4">
                  <p className="text-sm text-[#5e7196]">{t('vote.summary.noneSelected', 'No candidate selected yet.')}</p>
                </div>
              )}

              <div className="border-b border-[#d2def6] pb-3 mb-5">
                <p className="text-sm text-[#4f6691] leading-relaxed">
                  {t('vote.summary.oneVote', 'One account can cast only one vote per election. Review your selection carefully before submitting.')}
                </p>
              </div>

              <div className="border-b border-[#d2def6] pb-3 mb-5">
                <p className="text-xs uppercase tracking-[0.1em] text-[#5f7398] mb-2 inline-flex items-center gap-2">
                  <KeyRound className="w-3.5 h-3.5" /> {t('vote.verification.title', 'Strong Voter Verification')}
                </p>
                <p className="text-xs text-[#597099] leading-relaxed mb-3">
                  {t('vote.verification.body', 'Request a one-time 6-digit code, verify it, then submit your ballot.')}
                </p>

                <div className="flex flex-wrap gap-2 mb-3">
                  <button
                    type="button"
                    onClick={requestStrongVerificationCode}
                    disabled={requestingVerificationCode || hasVoted || !isElectionLive}
                    className="text-xs rounded-full border border-[#bfd1f8] bg-[#eaf2ff] text-[#1f66f4] px-3 py-1.5 font-semibold disabled:opacity-60"
                  >
                    {requestingVerificationCode ? t('vote.verification.requesting', 'Requesting...') : t('vote.verification.request', 'Request Code')}
                  </button>

                  <input
                    type="text"
                    value={verificationCode}
                    onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="form-field !py-1.5 !px-3 max-w-[150px]"
                    placeholder={t('vote.verification.placeholder', '6-digit code')}
                    disabled={hasVoted || !isElectionLive}
                  />

                  <button
                    type="button"
                    onClick={verifyStrongCode}
                    disabled={verifyingCode || hasVoted || !isElectionLive}
                    className="text-xs rounded-full border border-[#bfd1f8] bg-white text-[#35598e] px-3 py-1.5 font-semibold disabled:opacity-60"
                  >
                    {verifyingCode ? t('vote.verification.verifying', 'Verifying...') : t('vote.verification.verify', 'Verify Code')}
                  </button>
                </div>

                {verificationPreviewCode && (
                  <p className="text-xs text-[#5e7398] mb-2">
                    {t('vote.verification.preview', 'Dev preview code')}: <span className="font-semibold text-[#1f66f4]">{verificationPreviewCode}</span>
                  </p>
                )}

                {verificationExpiresAt && (
                  <p className="text-[11px] text-[#6b7fa6] mb-2">
                    {t('vote.verification.expires', 'Code expires at')}: {new Date(verificationExpiresAt).toLocaleTimeString()}
                  </p>
                )}

                {verificationMessage && !verificationError && (
                  <p className="text-xs text-[#1f7d3f]" role="status" aria-live="polite">{verificationMessage}</p>
                )}

                {verificationError && (
                  <p className="text-xs text-[#a43a3a]" role="alert" aria-live="assertive">{verificationError}</p>
                )}

                {verificationToken && (
                  <p className="text-xs text-[#1f66f4] mt-2 font-semibold">{t('vote.verification.active', 'Verification active for this election.')}</p>
                )}
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
                  {t('vote.terms', 'I confirm this vote is my independent and final decision.')}
                </span>
              </label>

              <button
                type="button"
                onClick={handleConfirmVote}
                disabled={loading || hasVoted || !selectedCandidate || !agreeToTerms || !isElectionLive || !verificationToken}
                className="btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading
                  ? t('vote.cta.submitting', 'Submitting vote...')
                  : hasVoted
                    ? t('vote.cta.submitted', 'Vote Already Submitted')
                    : !isElectionLive
                      ? t('vote.cta.notLive', 'Election Not Live')
                      : !verificationToken
                        ? t('vote.cta.completeVerification', 'Complete Verification First')
                        : t('vote.cta.confirm', 'Confirm Vote')}
              </button>

              <p className="text-xs text-[#60739a] mt-4 inline-flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 mt-0.5" />
                {t('vote.footerNote', 'Submission is protected by authenticated session and single-vote enforcement.')}
              </p>

              {hasVoted && (
                <div className="mt-3">
                  <p className="text-xs text-[#1f9c4c] inline-flex items-center gap-2">
                    <BadgeCheck className="w-4 h-4" />
                    {t('vote.recorded', 'Your vote has been successfully recorded.')}
                  </p>

                  {receipt && (
                    <div className="mt-3 border-t border-[#bcd0f5] pt-3">
                      <p className="text-xs uppercase tracking-[0.1em] text-[#5f7398] mb-1">{t('vote.receipt.title', 'Vote Receipt')}</p>
                      <p className="text-sm font-semibold text-[#1f66f4] break-all">{receiptCode}</p>
                      <p className="text-xs text-[#56709a] mt-2">{t('vote.statusLabel', 'Status')}: {receipt.status}</p>
                      <Link
                        to={withLanguagePath(`/receipt?code=${encodeURIComponent(receiptCode)}&electionId=${encodeURIComponent(selectedElectionId)}`)}
                        className="btn-secondary mt-3 !py-2 !px-4 text-xs inline-flex"
                      >
                        {t('vote.receipt.verify', 'Verify This Receipt')}
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
