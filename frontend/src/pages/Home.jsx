import { useEffect, useMemo, useState } from 'react';
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
import { useUiPreferences } from '../context/useUiPreferences';

const lifecycleStages = [
  { key: 'draft', titleKey: 'home.lifecycle.draft.title', descriptionKey: 'home.lifecycle.draft.description' },
  { key: 'registration', titleKey: 'home.lifecycle.registration.title', descriptionKey: 'home.lifecycle.registration.description' },
  { key: 'live', titleKey: 'home.lifecycle.live.title', descriptionKey: 'home.lifecycle.live.description' },
  { key: 'counting', titleKey: 'home.lifecycle.counting.title', descriptionKey: 'home.lifecycle.counting.description' },
  { key: 'audited', titleKey: 'home.lifecycle.audited.title', descriptionKey: 'home.lifecycle.audited.description' },
  { key: 'published', titleKey: 'home.lifecycle.published.title', descriptionKey: 'home.lifecycle.published.description' },
  { key: 'archived', titleKey: 'home.lifecycle.archived.title', descriptionKey: 'home.lifecycle.archived.description' }
];

const countValue = (value) => (value === null || value === undefined ? '...' : value);

const Home = () => {
  const { t, withLanguagePath } = useUiPreferences();
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
      title: t('home.stats.registeredVoters', 'Registered Voters'),
      value: countValue(stats?.totalRegisteredVoters),
      hint: t('home.stats.registeredHint', 'Identity-verified access')
    },
    {
      title: t('home.stats.votesCast', 'Votes Cast'),
      value: countValue(stats?.totalVotesCast),
      hint: t('home.stats.votesHint', 'Current election scope')
    },
    {
      title: t('home.stats.activeElections', 'Active Elections'),
      value: countValue(electionSummary.totalElections),
      hint: t('home.stats.electionsHint', 'Concurrent civic tracks')
    },
    {
      title: t('home.stats.turnout', 'Turnout'),
      value: stats ? `${stats.turnoutPercentage}%` : '...',
      hint: t('home.stats.turnoutHint', 'Participation health')
    }
  ];

  return (
    <main className="min-h-screen page-shell pt-20 pb-16">
      <section className="section-wrap">
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-10 items-start">
          <div className="surface-card px-8 pb-8 pt-3 md:px-12 md:pb-10 md:pt-5 relative overflow-hidden">
            <div className="relative z-10">
            <div className="eyebrow mb-6">
              <Landmark className="w-4 h-4" /> {t('home.hero.eyebrow', 'Public Decision Infrastructure')}
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl text-[#0f1f3d] leading-[1.05] mb-5">
              {t('home.hero.title', 'Secure digital voting with multi-election governance precision.')}
            </h1>

            <p className="text-base sm:text-lg text-[#4f6691] max-w-2xl mb-10 leading-relaxed">
              {t('home.hero.body', 'CivicBallot enables institutions to run multiple elections at once while preserving strict ballot scope, lifecycle control, transparent counting, and receipt-driven trust for every voter.')}
            </p>

            <div className="mb-8 grid grid-cols-1 sm:grid-cols-3 gap-3 border-y border-[#d6e1f6] py-5">
              <div className="p-2">
                <p className="text-xs uppercase tracking-[0.1em] text-[#60759a] mb-1">{t('home.hero.liveElections', 'Live Elections')}</p>
                <p className="text-2xl font-semibold text-[#102347]">{electionSummary.statusCounts.live}</p>
              </div>
              <div className="p-2 sm: sm: border-[#d6e1f6]">
                <p className="text-xs uppercase tracking-[0.1em] text-[#60759a] mb-1">{t('home.hero.trackedVotes', 'Tracked Votes')}</p>
                <p className="text-2xl font-semibold text-[#102347]">{countValue(electionSummary.totalElectionVotes)}</p>
              </div>
              <div className="p-2 sm: sm: border-[#d6e1f6]">
                <p className="text-xs uppercase tracking-[0.1em] text-[#60759a] mb-1">{t('home.hero.electionCandidates', 'Election Candidates')}</p>
                <p className="text-2xl font-semibold text-[#102347]">{countValue(electionSummary.totalElectionCandidates)}</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link to={withLanguagePath('/signup')} className="btn-primary inline-flex items-center justify-center gap-2">
                {t('home.hero.primaryCta', 'Create Voter Account')}
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link to={withLanguagePath('/vote')} className="btn-secondary inline-flex items-center justify-center gap-2">
                {t('home.hero.secondaryCta', 'Open Ballot Arena')}
                <Vote className="w-4 h-4" />
              </Link>
            </div>

            <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-4">
              {statCards.map((stat) => (
                <div key={stat.title} className="p-3 border-[#1f66f4]">
                  <p className="text-xs uppercase tracking-[0.08em] text-[#5f7298] mb-1">{stat.title}</p>
                  <p className="text-2xl font-semibold text-[#102347]">{stat.value}</p>
                  <p className="text-xs text-[#7285a9] mt-1">{stat.hint}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Link to={withLanguagePath('/candidates')} className="text-xs rounded-full border border-[#bfd2f8] bg-[#eaf2ff] px-4 py-2 text-[#1f66f4] font-semibold">
                {t('home.hero.linkCandidates', 'Candidate Profiles & Compare')}
              </Link>
              <Link to={withLanguagePath('/transparency')} className="text-xs rounded-full border border-[#bfd2f8] bg-[#eaf2ff] px-4 py-2 text-[#1f66f4] font-semibold">
                {t('home.hero.linkTransparency', 'Public Transparency Dashboard')}
              </Link>
              <Link to={withLanguagePath('/receipt')} className="text-xs rounded-full border border-[#bfd2f8] bg-[#eaf2ff] px-4 py-2 text-[#1f66f4] font-semibold">
                {t('home.hero.linkReceipt', 'Vote Receipt Verification')}
              </Link>
            </div>
            </div>
          </div>

          <aside className="surface-card px-5 pb-6 pt-2 sm:px-6 sm:pb-6 sm:pt-3 relative overflow-hidden">
            <div className="relative z-10 space-y-4">
              <div className="rounded-2xl overflow-hidden mb-6">
                <img
                  src={homeCivicVotingIllustration}
                  alt={t('home.hero.imageAlt', 'Citizens participating in a secure online voting ecosystem')}
                  className="w-full h-48 object-cover"
                  loading="lazy"
                />
              </div>

              <div className="border-[#bfd1f8] pb-5 mb-5">
                <p className="text-xs uppercase tracking-[0.12em] text-[#35598e] mb-2">{t('home.snapshot.title', 'Multi-Election Snapshot')}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-2">
                    <p className="text-xs text-[#60759a] uppercase tracking-[0.08em]">{t('home.snapshot.registration', 'Registration')}</p>
                    <p className="text-lg font-semibold text-[#102347]">{electionSummary.statusCounts.registration}</p>
                  </div>
                  <div className="p-2 border-[#bfd1f8]">
                    <p className="text-xs text-[#60759a] uppercase tracking-[0.08em]">{t('home.snapshot.counting', 'Counting')}</p>
                    <p className="text-lg font-semibold text-[#102347]">{electionSummary.statusCounts.counting}</p>
                  </div>
                </div>
              </div>

              <div className="border-[#bfd1f8] pb-5 mb-5">
                <p className="text-xs uppercase tracking-[0.12em] text-[#35598e] mb-2">{t('home.focus.title', 'Current Focus Election')}</p>
                {electionSummary.highlightedElection ? (
                  <>
                    <p className="text-lg text-[#102347] font-semibold leading-snug">{electionSummary.highlightedElection.name}</p>
                    <p className="text-sm text-[#5a6f96] mt-1 inline-flex items-center gap-1.5">
                      <CalendarDays className="w-4 h-4" /> {t('home.focus.status', 'Status')}: {electionSummary.highlightedElection.status}
                    </p>
                    <p className="text-xs text-[#6c7fa5] mt-2">
                      {t('home.focus.candidates', 'Candidates')}: {electionSummary.highlightedElection.totalCandidates || 0} | {t('home.focus.votes', 'Votes')}: {electionSummary.highlightedElection.totalVotesCast || 0}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-[#5a6f96]">{t('home.focus.empty', 'No active election is available yet.')}</p>
                )}
              </div>

              <div className="pt-2">
                <p className="text-xs uppercase tracking-[0.12em] text-[#35598e] mb-2">{t('home.standard.title', 'Governance Standard')}</p>
                <p className="text-lg font-semibold leading-snug text-[#102347]">{t('home.standard.body', 'Scoped ballots plus lifecycle controls create stronger democratic trust.')}</p>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="section-wrap mt-12">
        <div className="glass-panel p-6 md:p-7">
          <div className="grid grid-cols-1 xl:grid-cols-[1.05fr_0.95fr] gap-6">
            <div>
              <div className="mb-8">
                <p className="eyebrow mb-4">
                  <ClipboardCheck className="w-4 h-4" /> {t('home.steps.eyebrow', 'Steps To Use The Platform')}
                </p>
                <h2 className="text-2xl sm:text-3xl text-[#102347] mb-3">{t('home.steps.title', 'A clear, citizen-first voting journey')}</h2>
                <p className="text-[#5a6f95] max-w-3xl">{t('home.steps.subtitle', 'From registration to final vote confirmation, each step is designed for integrity, accessibility, and accountability.')}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <article className="border-[#1f66f4] pl-4">
                  <p className="text-xs text-[#4f6793] uppercase tracking-[0.1em] mb-3">{t('home.steps.step1.label', 'Step 01')}</p>
                  <UserRoundCheck className="w-6 h-6 text-[#1f66f4] mb-3" />
                  <h3 className="text-xl text-[#102347] mb-2">{t('home.steps.step1.title', 'Register Securely')}</h3>
                  <p className="text-sm text-[#5d7298]">{t('home.steps.step1.body', 'Create your voter profile with verified identity details and secure credentials.')}</p>
                </article>

                <article className="border-[#1f66f4] pl-4">
                  <p className="text-xs text-[#4f6793] uppercase tracking-[0.1em] mb-3">{t('home.steps.step2.label', 'Step 02')}</p>
                  <Shield className="w-6 h-6 text-[#1f66f4] mb-3" />
                  <h3 className="text-xl text-[#102347] mb-2">{t('home.steps.step2.title', 'Sign In & Verify')}</h3>
                  <p className="text-sm text-[#5d7298]">{t('home.steps.step2.body', 'Authenticate once and receive access to eligible election ballots.')}</p>
                </article>

                <article className="border-[#1f66f4] pl-4">
                  <p className="text-xs text-[#4f6793] uppercase tracking-[0.1em] mb-3">{t('home.steps.step3.label', 'Step 03')}</p>
                  <Vote className="w-6 h-6 text-[#1f66f4] mb-3" />
                  <h3 className="text-xl text-[#102347] mb-2">{t('home.steps.step3.title', 'Cast Election-Scoped Vote')}</h3>
                  <p className="text-sm text-[#5d7298]">{t('home.steps.step3.body', 'Submit your decision per election context with strict one-vote enforcement.')}</p>
                </article>

                <article className="border-[#1f66f4] pl-4">
                  <p className="text-xs text-[#4f6793] uppercase tracking-[0.1em] mb-3">{t('home.steps.step4.label', 'Step 04')}</p>
                  <BadgeCheck className="w-6 h-6 text-[#1f66f4] mb-3" />
                  <h3 className="text-xl text-[#102347] mb-2">{t('home.steps.step4.title', 'Verify Receipt Integrity')}</h3>
                  <p className="text-sm text-[#5d7298]">{t('home.steps.step4.body', 'Track your receipt status and validate election transparency in real time.')}</p>
                </article>
              </div>
            </div>

            <aside className="border-[#cfdef9] pl-6 md:pl-7">
              <p className="eyebrow mb-4">
                <CalendarDays className="w-4 h-4" /> {t('home.lifecycle.title', 'Multi-Election Lifecycle')}
              </p>
              <h3 className="text-2xl text-[#102347] mb-2">{t('home.lifecycle.subtitle', 'Every election follows a governed progression.')}</h3>
              <p className="text-sm text-[#5a6f95] mb-5">
                {t('home.lifecycle.body', 'The platform supports parallel elections while keeping each one independently scoped from setup to archive.')}
              </p>

              <div className="space-y-3">
                {lifecycleStages.map((stage, index) => (
                  <article key={stage.key} className="border-[#d7e2f7] py-3.5 last:">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 shrink-0 rounded-full bg-[#1f66f4]/10 text-[#1f66f4] text-xs font-semibold inline-flex items-center justify-center">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-semibold text-[#12305d]">{t(stage.titleKey)}</p>
                          <p className="text-xs text-[#5f7398]">
                            {electionSummary.statusCounts[stage.key]} {t('home.lifecycle.elections', 'elections')}
                          </p>
                        </div>
                        <p className="text-xs text-[#5f7398] mt-1 leading-relaxed">{t(stage.descriptionKey)}</p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="section-wrap mt-12">
        <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-6">
          <div className="surface-card p-6 md:p-7">
            <p className="eyebrow mb-5">
              <BarChart3 className="w-4 h-4" /> {t('home.why.eyebrow', 'Why Voting Is Needed')}
            </p>
            <h2 className="text-2xl sm:text-3xl text-[#102347] mb-4">{t('home.why.title', 'Voting turns public needs into enforceable priorities.')}</h2>
            <p className="text-[#5b7096] leading-relaxed mb-6">
              {t('home.why.body', 'Elections are not a ritual. They are an accountability mechanism that determines who allocates budgets, writes policy, and represents citizen concerns. High-quality participation leads to better institutions.')}
            </p>

            <div className="space-y-4">
              <div className="border-[#d4e0f6] pb-4 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#1f66f4] mt-0.5" />
                <p className="text-sm text-[#4f6691]">{t('home.why.point1', 'Voting legitimizes public leadership through citizen consent.')}</p>
              </div>
              <div className="border-[#d4e0f6] pb-4 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#1f66f4] mt-0.5" />
                <p className="text-sm text-[#4f6691]">{t('home.why.point2', 'It aligns public spending with real community priorities.')}</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#1f66f4] mt-0.5" />
                <p className="text-sm text-[#4f6691]">{t('home.why.point3', 'It creates peaceful transfer of power and policy continuity.')}</p>
              </div>
            </div>
          </div>

          <div className="glass-panel p-6 md:p-7 flex flex-col justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.12em] text-[#4f6793] mb-4">{t('home.evolution.eyebrow', 'Platform Evolution')}</p>
              <h3 className="text-2xl text-[#112851] mb-4">{t('home.evolution.title', 'From one ballot to multi-election orchestration.')}</h3>
              <p className="text-[#5f7298] leading-relaxed">
                {t('home.evolution.body', 'A mature voting platform should reduce friction for voters while increasing confidence for regulators, observers, and election administrators.')}
              </p>

              <div className="mt-6 space-y-3">
                <div className="border-[#d6e1f4] pb-3 flex items-start gap-2">
                  <BadgeCheck className="w-4 h-4 text-[#1f66f4] mt-0.5 shrink-0" />
                  <p className="text-sm text-[#4f6691]">{t('home.evolution.point1', 'One vote per user per election with separate receipt records.')}</p>
                </div>
                <div className="border-[#d6e1f4] pb-3 flex items-start gap-2">
                  <BadgeCheck className="w-4 h-4 text-[#1f66f4] mt-0.5 shrink-0" />
                  <p className="text-sm text-[#4f6691]">{t('home.evolution.point2', 'Election-specific candidate pools and independent transparency metrics.')}</p>
                </div>
                <div className="flex items-start gap-2">
                  <BadgeCheck className="w-4 h-4 text-[#1f66f4] mt-0.5 shrink-0" />
                  <p className="text-sm text-[#4f6691]">{t('home.evolution.point3', 'Lifecycle transitions from draft to archive with governance checkpoints.')}</p>
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link to={withLanguagePath('/signup')} className="btn-primary inline-flex items-center gap-2">
                {t('home.evolution.primaryCta', 'Join The Election')}
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link to={withLanguagePath('/transparency')} className="btn-secondary inline-flex items-center gap-2">
                {t('home.evolution.secondaryCta', 'Explore Transparency')}
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