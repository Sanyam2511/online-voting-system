import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRightLeft, BadgeCheck, CalendarDays, LoaderCircle, Search, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import candidateCompareIllustration from '../assets/illustrations/candidate-compare.svg';

const normalizeToken = (value) => value.trim().replace(/\.+$/, '');

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

const getCandidateFocusPoints = (candidate) => {
  const explicitPriorities = (candidate.priorities || [])
    .map((item) => normalizeToken(item))
    .filter(Boolean);

  if (explicitPriorities.length > 0) {
    return explicitPriorities;
  }

  return (candidate.manifesto || '')
    .replace(/\band\b/gi, ',')
    .split(',')
    .map((item) => normalizeToken(item))
    .filter(Boolean);
};

const getCandidateRegion = (candidate) => {
  if (candidate.region?.trim()) {
    return candidate.region;
  }

  const focusPoints = getCandidateFocusPoints(candidate);
  return focusPoints[0] ? `${focusPoints[0]} District` : 'National Civic District';
};

const getCandidateExperience = (candidate) => {
  if (candidate.experience?.trim()) {
    return candidate.experience;
  }

  const focusPoints = getCandidateFocusPoints(candidate);

  if (focusPoints.length >= 2) {
    return `Policy leadership in ${focusPoints[0]} and ${focusPoints[1]}`;
  }

  if (focusPoints.length === 1) {
    return `Policy leadership in ${focusPoints[0]}`;
  }

  return 'Public administration and civic policy leadership';
};

const getCandidatePrioritiesText = (candidate) => {
  const focusPoints = getCandidateFocusPoints(candidate);

  if (focusPoints.length >= 2) {
    return focusPoints.slice(0, 2).join(', ');
  }

  if (focusPoints.length === 1) {
    return `${focusPoints[0]}, Citizen service delivery`;
  }

  return 'Citizen service delivery, Policy accountability';
};

const getCandidatePriorityTags = (candidate) => {
  const focusPoints = getCandidateFocusPoints(candidate);

  if (focusPoints.length >= 3) {
    return focusPoints.slice(0, 3);
  }

  if (focusPoints.length === 2) {
    return [...focusPoints, 'Transparent governance'];
  }

  if (focusPoints.length === 1) {
    return [focusPoints[0], 'Citizen service delivery', 'Transparent governance'];
  }

  return ['Citizen service delivery', 'Policy accountability', 'Transparent governance'];
};

const CandidateProfiles = () => {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const [compareIds, setCompareIds] = useState([]);
  const [compareCandidates, setCompareCandidates] = useState([]);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState('');

  const [elections, setElections] = useState([]);
  const [selectedElectionId, setSelectedElectionId] = useState('');

  const selectedElection = useMemo(
    () => elections.find((election) => election._id === selectedElectionId) || null,
    [elections, selectedElectionId]
  );

  useEffect(() => {
    const fetchElections = async () => {
      try {
        const response = await api.get('/vote/elections/public');
        const electionList = response.data?.elections || [];
        setElections(electionList);

        if (electionList.length > 0) {
          const liveElection = electionList.find((election) => election.status === 'live');
          setSelectedElectionId(liveElection?._id || electionList[0]._id);
        }
      } catch {
        setError('Unable to load elections. Please try again.');
        setLoading(false);
      }
    };

    fetchElections();
  }, []);

  useEffect(() => {
    const fetchCandidates = async () => {
      if (!selectedElectionId) {
        setCandidates([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');
      setSelectedProfileId('');
      setProfile(null);
      setCompareIds([]);
      setCompareCandidates([]);
      setCompareError('');

      try {
        const response = await api.get('/vote/candidates', {
          params: { electionId: selectedElectionId }
        });

        setCandidates(response.data?.candidates || []);
      } catch {
        setError('Unable to load candidate profiles for this election. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchCandidates();
  }, [selectedElectionId]);

  useEffect(() => {
    const fetchComparedCandidates = async () => {
      if (compareIds.length < 2) {
        setCompareCandidates([]);
        setCompareError('');
        return;
      }

      setCompareLoading(true);
      setCompareError('');

      try {
        const response = await api.get('/vote/compare', {
          params: {
            candidateIds: compareIds.join(','),
            electionId: selectedElectionId
          }
        });

        setCompareCandidates(response.data.candidates || []);
      } catch (requestError) {
        setCompareError(requestError.response?.data?.message || 'Failed to load comparison data.');
      } finally {
        setCompareLoading(false);
      }
    };

    fetchComparedCandidates();
  }, [compareIds, selectedElectionId]);

  const filteredCandidates = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return candidates;
    }

    return candidates.filter((candidate) =>
      `${candidate.name} ${candidate.party} ${candidate.region} ${candidate.manifesto}`
        .toLowerCase()
        .includes(normalizedSearch)
    );
  }, [candidates, search]);

  const groupedCandidates = useMemo(() => {
    return filteredCandidates.reduce((grouped, candidate) => {
      if (!grouped[candidate.party]) {
        grouped[candidate.party] = [];
      }

      grouped[candidate.party].push(candidate);
      return grouped;
    }, {});
  }, [filteredCandidates]);

  const fetchCandidateProfile = async (candidateId) => {
    setSelectedProfileId(candidateId);
    setProfileLoading(true);

    try {
      const response = await api.get(`/vote/candidates/${candidateId}`);
      setProfile(response.data);
    } catch {
      setProfile(null);
    } finally {
      setProfileLoading(false);
    }
  };

  const toggleCompareCandidate = (candidateId) => {
    setCompareError('');
    setCompareIds((currentIds) => {
      if (currentIds.includes(candidateId)) {
        return currentIds.filter((id) => id !== candidateId);
      }

      if (currentIds.length >= 3) {
        setCompareError('You can compare up to 3 candidates at once.');
        return currentIds;
      }

      return [...currentIds, candidateId];
    });
  };

  const resetComparison = () => {
    setCompareIds([]);
    setCompareCandidates([]);
    setCompareError('');
  };

  return (
    <main className="min-h-screen pt-28 pb-16">
      <div className="section-wrap">
        <header className="glass-panel p-8 md:p-10 mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-center">
            <div>
              <p className="eyebrow mb-4">
                <ArrowRightLeft className="w-4 h-4" /> Candidate Profiles + Compare
              </p>
              <h1 className="text-4xl sm:text-5xl text-[#102347] mb-2">Explore Candidates Deeply</h1>
              <p className="text-[#5d7298] leading-relaxed max-w-3xl">
                Review verified candidate profiles and compare up to three candidates side-by-side before entering the ballot arena.
              </p>

              <div className="mt-5 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-end">
                <div>
                  <label htmlFor="candidate-election" className="block text-xs uppercase tracking-[0.12em] text-[#5f7398] mb-2">
                    Election Context
                  </label>
                  <select
                    id="candidate-election"
                    value={selectedElectionId}
                    onChange={(event) => setSelectedElectionId(event.target.value)}
                    className="form-field"
                    disabled={elections.length === 0}
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
            </div>

            <div className="rounded-2xl overflow-hidden border border-[#c8d8f6] bg-white">
              <img
                src={candidateCompareIllustration}
                alt="Candidate comparison board"
                className="w-full h-44 object-cover"
                loading="lazy"
              />
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
          <section>
            <div className="surface-card p-6 mb-6">
              <div className="relative">
                <Search className="w-4 h-4 text-[#6f84aa] absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by candidate, party, region, or manifesto"
                  className="form-field form-field-with-icon"
                />
              </div>
            </div>

            {loading ? (
              <div className="surface-card p-10 text-center">
                <LoaderCircle className="w-7 h-7 animate-spin text-[#1f66f4] mx-auto mb-3" />
                <p className="text-[#597098]">Loading candidate profiles...</p>
              </div>
            ) : error ? (
              <div className="surface-card p-6 border border-[#f1c6c6] bg-[#fff1f1]">
                <p className="text-[#a73939]">{error}</p>
              </div>
            ) : Object.keys(groupedCandidates).length === 0 ? (
              <div className="surface-card p-8 text-center">
                <p className="text-[#5f7398]">No candidates found for this election.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedCandidates).map(([partyName, partyCandidates]) => (
                  <article key={partyName} className="surface-card p-6">
                    <h2 className="text-2xl text-[#112a56] mb-4">{partyName}</h2>
                    <div className="space-y-4">
                      {partyCandidates.map((candidate) => {
                        const isCompared = compareIds.includes(candidate._id);
                        const isProfileSelected = selectedProfileId === candidate._id;

                        return (
                          <div key={candidate._id} className="rounded-2xl border border-[#d5e0f4] bg-white p-4">
                            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                              <img
                                src={candidate.imageUrl}
                                alt={candidate.name}
                                className="w-16 h-16 rounded-2xl border border-[#c5d7f6] object-cover"
                              />

                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="text-lg font-semibold text-[#14305f]">{candidate.name}</p>
                                    <p className="text-sm text-[#5f7398]">{getCandidateRegion(candidate)}</p>
                                  </div>
                                  {candidate.isVerified && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-[#eaf2ff] border border-[#c4d6f6] px-3 py-1 text-xs text-[#1f66f4] font-semibold">
                                      <BadgeCheck className="w-3.5 h-3.5" /> Verified
                                    </span>
                                  )}
                                </div>

                                <p className="text-sm text-[#20406f] mt-2">{candidate.campaignTagline || candidate.manifesto}</p>
                                <p className="text-xs text-[#60759b] mt-2 line-clamp-2">{candidate.manifesto}</p>

                                <div className="mt-3 flex flex-wrap gap-2">
                                  {getCandidatePriorityTags(candidate).map((priority) => (
                                    <span key={`${candidate._id}-${priority}`} className="text-xs rounded-full border border-[#c6d7f6] bg-[#f4f8ff] px-3 py-1 text-[#436395]">
                                      {priority}
                                    </span>
                                  ))}
                                </div>

                                <div className="mt-4 flex flex-wrap items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => fetchCandidateProfile(candidate._id)}
                                    className={`btn-secondary !px-4 !py-2 text-xs ${isProfileSelected ? '!border-[#1f66f4] !text-[#1f66f4]' : ''}`}
                                  >
                                    {isProfileSelected ? 'Profile Open' : 'View Profile'}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => toggleCompareCandidate(candidate._id)}
                                    className={`text-xs rounded-full px-4 py-2 font-semibold border transition ${
                                      isCompared
                                        ? 'border-[#1f66f4] bg-[#1f66f4] text-white'
                                        : 'border-[#bfd1f8] bg-[#eaf2ff] text-[#1f66f4]'
                                    }`}
                                  >
                                    {isCompared ? 'Remove Compare' : 'Add To Compare'}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <aside className="space-y-6 lg:sticky lg:top-28 h-fit">
            <section className="glass-panel p-6">
              <h3 className="text-xl text-[#12305c] mb-4">Candidate Profile</h3>
              {profileLoading ? (
                <div className="text-center py-8">
                  <LoaderCircle className="w-6 h-6 animate-spin text-[#1f66f4] mx-auto mb-2" />
                  <p className="text-sm text-[#5f7398]">Loading profile...</p>
                </div>
              ) : profile ? (
                <div>
                  <img
                    src={profile.imageUrl}
                    alt={profile.name}
                    className="w-full h-44 rounded-2xl object-cover border border-[#c8d8f6] mb-4"
                  />
                  <p className="text-lg font-semibold text-[#12305d]">{profile.name}</p>
                  <p className="text-sm text-[#5f7398] mb-2">{profile.party}</p>
                  <p className="text-sm text-[#24416f] mb-3">{profile.campaignTagline || profile.manifesto}</p>
                  <p className="text-sm text-[#60759b] leading-relaxed mb-3">{profile.bio || profile.manifesto}</p>

                  <div className="space-y-1 text-xs text-[#4f6791]">
                    <p><span className="font-semibold">Region:</span> {getCandidateRegion(profile)}</p>
                    <p><span className="font-semibold">Education:</span> {profile.education || 'N/A'}</p>
                    <p><span className="font-semibold">Experience:</span> {getCandidateExperience(profile)}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-[#60759b]">Pick any candidate to view a full profile.</p>
              )}
            </section>

            <section className="glass-panel p-6">
              <div className="flex items-center justify-between gap-3 mb-4">
                <h3 className="text-xl text-[#12305c]">Compare Board</h3>
                {compareIds.length > 0 && (
                  <button
                    type="button"
                    onClick={resetComparison}
                    className="text-xs inline-flex items-center gap-1 text-[#456796] hover:text-[#1f66f4]"
                  >
                    <X className="w-3.5 h-3.5" /> Reset
                  </button>
                )}
              </div>

              <p className="text-xs text-[#5f7398] mb-3">Select 2 to 3 candidates for side-by-side comparison.</p>

              <div className="flex flex-wrap gap-2 mb-4">
                {compareIds.length === 0 ? (
                  <span className="text-xs text-[#6a7fa6]">No candidates selected.</span>
                ) : (
                  compareIds.map((id) => {
                    const candidate = candidates.find((item) => item._id === id);
                    return (
                      <span key={id} className="text-xs rounded-full border border-[#bfd1f8] bg-[#eaf2ff] text-[#1f66f4] px-3 py-1">
                        {candidate?.name || 'Selected'}
                      </span>
                    );
                  })
                )}
              </div>

              {compareError && <p className="text-xs text-[#b63f3f] mb-3">{compareError}</p>}

              {compareLoading ? (
                <div className="text-center py-6">
                  <LoaderCircle className="w-5 h-5 animate-spin text-[#1f66f4] mx-auto mb-2" />
                  <p className="text-xs text-[#60759b]">Loading comparison...</p>
                </div>
              ) : compareCandidates.length >= 2 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-separate border-spacing-y-2">
                    <tbody>
                      <tr>
                        <th className="text-left text-[#6d81a8] font-semibold pr-3">Field</th>
                        {compareCandidates.map((candidate) => (
                          <th key={candidate._id} className="text-left text-[#12305d] font-semibold min-w-[130px]">{candidate.name}</th>
                        ))}
                      </tr>
                      <tr>
                        <td className="text-[#6d81a8]">Party</td>
                        {compareCandidates.map((candidate) => <td key={`${candidate._id}-party`} className="text-[#345584] align-top whitespace-normal break-words">{candidate.party}</td>)}
                      </tr>
                      <tr>
                        <td className="text-[#6d81a8]">Region</td>
                        {compareCandidates.map((candidate) => <td key={`${candidate._id}-region`} className="text-[#345584] align-top whitespace-normal break-words">{getCandidateRegion(candidate)}</td>)}
                      </tr>
                      <tr>
                        <td className="text-[#6d81a8]">Experience</td>
                        {compareCandidates.map((candidate) => <td key={`${candidate._id}-exp`} className="text-[#345584] align-top whitespace-normal break-words">{getCandidateExperience(candidate)}</td>)}
                      </tr>
                      <tr>
                        <td className="text-[#6d81a8]">Priorities</td>
                        {compareCandidates.map((candidate) => (
                          <td key={`${candidate._id}-pri`} className="text-[#345584] align-top whitespace-normal break-words">{getCandidatePrioritiesText(candidate)}</td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-[#60759b]">Comparison table appears once you select at least 2 candidates.</p>
              )}

              <Link to="/vote" className="btn-primary mt-5 inline-flex items-center justify-center w-full !py-2.5 text-sm">
                Continue To Ballot
              </Link>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
};

export default CandidateProfiles;
