import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Landmark,
  Shield,
  UserRoundCheck,
  Vote
} from 'lucide-react';
import api from '../lib/api';
import homeCivicVotingIllustration from '../assets/illustrations/home-civic-voting.svg';

const lifecycleStages = [
  {
    key: 'draft',
    title: 'Draft',
    description: 'Election administrators define scope, rules, and schedule windows.'
  },
  {
    key: 'registration',
    title: 'Registration',
    description: 'Voter and candidate onboarding remains open before vote launch.'
  },
  {
    key: 'live',
    title: 'Live Voting',
    description: 'Citizens cast election-scoped ballots with receipt-backed confirmation.'
  },
  {
    key: 'counting',
    title: 'Counting',
    description: 'Votes are aggregated while integrity checks are continuously applied.'
  },
  {
    key: 'audited',
    title: 'Audited',
    description: 'Audit controls validate outcomes before final public publication.'
  },
  {
    key: 'published',
    title: 'Published',
    description: 'Election outcomes and transparency metrics are released for review.'
  },
  {
    key: 'archived',
    title: 'Archived',
    description: 'Closed elections remain queryable for long-term governance records.'
  }
];

const countValue = (value) => (value === null || value === undefined ? '...' : value);

const Home = () => {
  const [stats, setStats] = useState(null);
  const [elections, setElections] = useState([]);

  useEffect(() => {
    const fetchHomeData = async () => {
      const [statsResponse, electionsResponse] = await Promise.allSettled([
        api.get('/vote/stats'),
        api.get('/vote/elections/public')
      ]);

      if (statsResponse.status === 'fulfilled') {
        setStats(statsResponse.value.data || null);
      } else {
        setStats(null);
      }

      if (electionsResponse.status === 'fulfilled') {
        setElections(electionsResponse.value.data?.elections || []);
      } else {
        setElections([]);
      }
    };

    fetchHomeData();
  }, []);

  const electionSummary = useMemo(() => {
    const statusCounts = lifecycleStages.reduce((acc, stage) => {
      acc[stage.key] = 0;
      return acc;
    }, {});

    elections.forEach((election) => {
      const statusKey = election.status || 'draft';
      if (Object.prototype.hasOwnProperty.call(statusCounts, statusKey)) {
        statusCounts[statusKey] += 1;
      }
    });

    return {
      totalElections: elections.length,
      totalElectionVotes: elections.reduce((sum, election) => sum + Number(election.totalVotesCast || 0), 0),
      totalElectionCandidates: elections.reduce((sum, election) => sum + Number(election.totalCandidates || 0), 0),
      statusCounts,
      highlightedElection: elections[0] || null
    };
  }, [elections]);

  const statCards = [
    {
      title: 'Registered Voters',
      value: countValue(stats?.totalRegisteredVoters),
      hint: 'Identity-verified access'
    },
    {
      title: 'Votes Cast',
      value: countValue(stats?.totalVotesCast),
      hint: 'Current election scope'
    },
    {
      title: 'Active Elections',
      value: countValue(electionSummary.totalElections),
      hint: 'Concurrent civic tracks'
    },
    {
      title: 'Turnout',
      value: stats ? `${stats.turnoutPercentage}%` : '...',
      hint: 'Participation health'
    }
  ];

  return (
    <main className="min-h-screen page-shell pt-28 pb-20">
      <section className="section-wrap">
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-10 items-stretch">
          <div className="surface-card p-8 md:p-12 relative overflow-hidden">
            <div className="absolute -top-24 -right-16 w-64 h-64 rounded-full bg-[#d9e8ff] blur-3xl opacity-70" aria-hidden="true"></div>
            <div className="relative z-10">
            <div className="eyebrow mb-6">
              <Landmark className="w-4 h-4" /> Public Decision Infrastructure
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl text-[#0f1f3d] leading-[1.05] mb-5">
              Secure digital voting with multi-election governance precision.
            </h1>

            <p className="text-base sm:text-lg text-[#4f6691] max-w-2xl mb-10 leading-relaxed">
              CivicBallot enables institutions to run multiple elections at once while preserving strict ballot scope,
              lifecycle control, transparent counting, and receipt-driven trust for every voter.
            </p>

            <div className="mb-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-2xl border border-[#c9d9f6] bg-white/85 p-3">
                <p className="text-xs uppercase tracking-[0.1em] text-[#60759a] mb-1">Live Elections</p>
                <p className="text-2xl font-semibold text-[#102347]">{electionSummary.statusCounts.live}</p>
              </div>
              <div className="rounded-2xl border border-[#c9d9f6] bg-white/85 p-3">
                <p className="text-xs uppercase tracking-[0.1em] text-[#60759a] mb-1">Tracked Votes</p>
                <p className="text-2xl font-semibold text-[#102347]">{countValue(electionSummary.totalElectionVotes)}</p>
              </div>
              <div className="rounded-2xl border border-[#c9d9f6] bg-white/85 p-3">
                <p className="text-xs uppercase tracking-[0.1em] text-[#60759a] mb-1">Election Candidates</p>
                <p className="text-2xl font-semibold text-[#102347]">{countValue(electionSummary.totalElectionCandidates)}</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link to="/signup" className="btn-primary inline-flex items-center justify-center gap-2">
                Create Voter Account
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link to="/vote" className="btn-secondary inline-flex items-center justify-center gap-2">
                Open Ballot Arena
                <Vote className="w-4 h-4" />
              </Link>
            </div>

            <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {statCards.map((stat) => (
                <div key={stat.title} className="rounded-2xl border border-[#d6e1f6] bg-white p-4 shadow-[0_8px_24px_rgba(20,52,108,0.06)]">
                  <p className="text-xs uppercase tracking-[0.08em] text-[#5f7298] mb-2">{stat.title}</p>
                  <p className="text-2xl font-semibold text-[#102347]">{stat.value}</p>
                  <p className="text-xs text-[#7285a9] mt-1">{stat.hint}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Link to="/candidates" className="text-xs rounded-full border border-[#bfd2f8] bg-[#eaf2ff] px-4 py-2 text-[#1f66f4] font-semibold">
                Candidate Profiles & Compare
              </Link>
              <Link to="/transparency" className="text-xs rounded-full border border-[#bfd2f8] bg-[#eaf2ff] px-4 py-2 text-[#1f66f4] font-semibold">
                Public Transparency Dashboard
              </Link>
              <Link to="/receipt" className="text-xs rounded-full border border-[#bfd2f8] bg-[#eaf2ff] px-4 py-2 text-[#1f66f4] font-semibold">
                Vote Receipt Verification
              </Link>
            </div>
            </div>
          </div>

          <aside className="surface-card p-6 sm:p-8 relative overflow-hidden">
            <div className="absolute inset-x-10 top-6 h-32 rounded-full bg-[#d6e6ff] blur-3xl opacity-80" aria-hidden="true"></div>
            <div className="relative z-10 space-y-4">
              <div className="rounded-2xl border border-[#bfd1f8] bg-white overflow-hidden shadow-sm">
                <img
                  src={homeCivicVotingIllustration}
                  alt="Citizens participating in a secure online voting ecosystem"
                  className="w-full h-48 object-cover"
                  loading="lazy"
                />
              </div>

              <div className="rounded-2xl border border-[#bfd1f8] bg-[#eaf1ff] p-5">
                <p className="text-xs uppercase tracking-[0.12em] text-[#35598e] mb-2">Multi-Election Snapshot</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-[#c6d5f3] bg-white p-3">
                    <p className="text-xs text-[#60759a] uppercase tracking-[0.08em]">Registration</p>
                    <p className="text-lg font-semibold text-[#102347]">{electionSummary.statusCounts.registration}</p>
                  </div>
                  <div className="rounded-xl border border-[#c6d5f3] bg-white p-3">
                    <p className="text-xs text-[#60759a] uppercase tracking-[0.08em]">Counting</p>
                    <p className="text-lg font-semibold text-[#102347]">{electionSummary.statusCounts.counting}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-[#bfd1f8] bg-white p-5">
                <p className="text-xs uppercase tracking-[0.12em] text-[#35598e] mb-2">Current Focus Election</p>
                {electionSummary.highlightedElection ? (
                  <>
                    <p className="text-lg text-[#102347] font-semibold leading-snug">{electionSummary.highlightedElection.name}</p>
                    <p className="text-sm text-[#5a6f96] mt-1 inline-flex items-center gap-1.5">
                      <CalendarDays className="w-4 h-4" /> Status: {electionSummary.highlightedElection.status}
                    </p>
                    <p className="text-xs text-[#6c7fa5] mt-2">
                      Candidates: {electionSummary.highlightedElection.totalCandidates || 0} | Votes: {electionSummary.highlightedElection.totalVotesCast || 0}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-[#5a6f96]">No active election is available yet.</p>
                )}
              </div>

              <div className="rounded-2xl border border-[#bfd1f8] bg-[#1f66f4] p-5 text-white">
                <p className="text-xs uppercase tracking-[0.12em] text-[#dbe8ff] mb-2">Governance Standard</p>
                <p className="text-lg font-semibold leading-snug">Scoped ballots plus lifecycle controls create stronger democratic trust.</p>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="section-wrap mt-16">
        <div className="glass-panel p-8 md:p-10">
          <div className="grid grid-cols-1 xl:grid-cols-[1.05fr_0.95fr] gap-6">
            <div>
              <div className="mb-8">
                <p className="eyebrow mb-4">
                  <ClipboardCheck className="w-4 h-4" /> Steps To Use The Platform
                </p>
                <h2 className="text-3xl sm:text-4xl text-[#102347] mb-3">A clear, citizen-first voting journey</h2>
                <p className="text-[#5a6f95] max-w-3xl">From registration to final vote confirmation, each step is designed for integrity, accessibility, and accountability.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <article className="rounded-2xl border border-[#d3e0fb] p-5 bg-white">
                  <p className="text-xs text-[#4f6793] uppercase tracking-[0.1em] mb-3">Step 01</p>
                  <UserRoundCheck className="w-6 h-6 text-[#1f66f4] mb-3" />
                  <h3 className="text-xl text-[#102347] mb-2">Register Securely</h3>
                  <p className="text-sm text-[#5d7298]">Create your voter profile with verified identity details and secure credentials.</p>
                </article>

                <article className="rounded-2xl border border-[#d3e0fb] p-5 bg-white">
                  <p className="text-xs text-[#4f6793] uppercase tracking-[0.1em] mb-3">Step 02</p>
                  <Shield className="w-6 h-6 text-[#1f66f4] mb-3" />
                  <h3 className="text-xl text-[#102347] mb-2">Sign In & Verify</h3>
                  <p className="text-sm text-[#5d7298]">Authenticate once and receive access to eligible election ballots.</p>
                </article>

                <article className="rounded-2xl border border-[#d3e0fb] p-5 bg-white">
                  <p className="text-xs text-[#4f6793] uppercase tracking-[0.1em] mb-3">Step 03</p>
                  <Vote className="w-6 h-6 text-[#1f66f4] mb-3" />
                  <h3 className="text-xl text-[#102347] mb-2">Cast Election-Scoped Vote</h3>
                  <p className="text-sm text-[#5d7298]">Submit your decision per election context with strict one-vote enforcement.</p>
                </article>

                <article className="rounded-2xl border border-[#d3e0fb] p-5 bg-white">
                  <p className="text-xs text-[#4f6793] uppercase tracking-[0.1em] mb-3">Step 04</p>
                  <BadgeCheck className="w-6 h-6 text-[#1f66f4] mb-3" />
                  <h3 className="text-xl text-[#102347] mb-2">Verify Receipt Integrity</h3>
                  <p className="text-sm text-[#5d7298]">Track your receipt status and validate election transparency in real time.</p>
                </article>
              </div>
            </div>

            <aside className="rounded-2xl border border-[#cfdef9] bg-white p-6 md:p-7 shadow-[0_18px_42px_rgba(18,52,108,0.1)]">
              <p className="eyebrow mb-4">
                <CalendarDays className="w-4 h-4" /> Multi-Election Lifecycle
              </p>
              <h3 className="text-2xl text-[#102347] mb-2">Every election follows a governed progression.</h3>
              <p className="text-sm text-[#5a6f95] mb-5">
                The platform supports parallel elections while keeping each one independently scoped from setup to archive.
              </p>

              <div className="space-y-3">
                {lifecycleStages.map((stage, index) => (
                  <article key={stage.key} className="rounded-xl border border-[#d7e2f7] bg-[#f8fbff] p-3.5">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 shrink-0 rounded-full border border-[#bdd0f8] bg-white text-[#1f66f4] text-xs font-semibold inline-flex items-center justify-center">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-semibold text-[#12305d]">{stage.title}</p>
                          <p className="text-xs text-[#5f7398]">
                            {electionSummary.statusCounts[stage.key]} elections
                          </p>
                        </div>
                        <p className="text-xs text-[#5f7398] mt-1 leading-relaxed">{stage.description}</p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="section-wrap mt-16">
        <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-6">
          <div className="surface-card p-8 md:p-10">
            <p className="eyebrow mb-5">
              <BarChart3 className="w-4 h-4" /> Why Voting Is Needed
            </p>
            <h2 className="text-3xl sm:text-4xl text-[#102347] mb-4">Voting turns public needs into enforceable priorities.</h2>
            <p className="text-[#5b7096] leading-relaxed mb-6">
              Elections are not a ritual. They are an accountability mechanism that determines who allocates budgets,
              writes policy, and represents citizen concerns. High-quality participation leads to better institutions.
            </p>

            <div className="space-y-4">
              <div className="rounded-2xl border border-[#d4e0f6] bg-white p-4 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#1f66f4] mt-0.5" />
                <p className="text-sm text-[#4f6691]">Voting legitimizes public leadership through citizen consent.</p>
              </div>
              <div className="rounded-2xl border border-[#d4e0f6] bg-white p-4 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#1f66f4] mt-0.5" />
                <p className="text-sm text-[#4f6691]">It aligns public spending with real community priorities.</p>
              </div>
              <div className="rounded-2xl border border-[#d4e0f6] bg-white p-4 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#1f66f4] mt-0.5" />
                <p className="text-sm text-[#4f6691]">It creates peaceful transfer of power and policy continuity.</p>
              </div>
            </div>
          </div>

          <div className="glass-panel p-8 md:p-10 flex flex-col justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.12em] text-[#4f6793] mb-4">Platform Evolution</p>
              <h3 className="text-3xl text-[#112851] mb-4">From one ballot to multi-election orchestration.</h3>
              <p className="text-[#5f7298] leading-relaxed">
                A mature voting platform should reduce friction for voters while increasing confidence for regulators,
                observers, and election administrators.
              </p>

              <div className="mt-6 space-y-3">
                <div className="rounded-xl border border-[#d6e1f4] bg-white p-3 inline-flex items-start gap-2">
                  <BadgeCheck className="w-4 h-4 text-[#1f66f4] mt-0.5" />
                  <p className="text-sm text-[#4f6691]">One vote per user per election with separate receipt records.</p>
                </div>
                <div className="rounded-xl border border-[#d6e1f4] bg-white p-3 inline-flex items-start gap-2">
                  <BadgeCheck className="w-4 h-4 text-[#1f66f4] mt-0.5" />
                  <p className="text-sm text-[#4f6691]">Election-specific candidate pools and independent transparency metrics.</p>
                </div>
                <div className="rounded-xl border border-[#d6e1f4] bg-white p-3 inline-flex items-start gap-2">
                  <BadgeCheck className="w-4 h-4 text-[#1f66f4] mt-0.5" />
                  <p className="text-sm text-[#4f6691]">Lifecycle transitions from draft to archive with governance checkpoints.</p>
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/signup" className="btn-primary inline-flex items-center gap-2">
                Join The Election
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link to="/transparency" className="btn-secondary inline-flex items-center gap-2">
                Explore Transparency
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Home;