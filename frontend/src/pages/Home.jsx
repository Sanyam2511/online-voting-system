import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  Landmark,
  Shield,
  UserRoundCheck,
  Vote
} from 'lucide-react';
import api from '../lib/api';
import homeCivicVotingIllustration from '../assets/illustrations/home-civic-voting.svg';

const Home = () => {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/vote/stats');
        setStats(response.data);
      } catch {
        setStats(null);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    {
      title: 'Registered Voters',
      value: stats ? stats.totalRegisteredVoters : '...'
    },
    {
      title: 'Votes Cast',
      value: stats ? stats.totalVotesCast : '...'
    },
    {
      title: 'Candidates',
      value: stats ? stats.totalCandidates : '...'
    },
    {
      title: 'Turnout',
      value: stats ? `${stats.turnoutPercentage}%` : '...'
    }
  ];

  return (
    <main className="pt-28 pb-20">
      <section className="section-wrap">
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-10 items-stretch">
          <div className="surface-card p-8 md:p-12">
            <div className="eyebrow mb-6">
              <Landmark className="w-4 h-4" /> Public Decision Infrastructure
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl text-[#0f1f3d] leading-[1.05] mb-5">
              Build a stronger democracy with secure digital voting.
            </h1>

            <p className="text-base sm:text-lg text-[#4f6691] max-w-2xl mb-10 leading-relaxed">
              CivicBallot helps citizens participate in elections with verifiable identity, transparent counting,
              and accountable governance outcomes. Designed for institutions that require trust, clarity, and scale.
            </p>

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
                <div key={stat.title} className="rounded-2xl border border-[#d6e1f6] bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.08em] text-[#5f7298] mb-2">{stat.title}</p>
                  <p className="text-2xl font-semibold text-[#102347]">{stat.value}</p>
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
                <p className="text-xs uppercase tracking-[0.12em] text-[#35598e] mb-2">Identity & Access</p>
                <p className="text-lg text-[#102347] font-semibold leading-snug">Citizens are authenticated before ballot access.</p>
              </div>

              <div className="rounded-2xl border border-[#bfd1f8] bg-white p-5">
                <p className="text-xs uppercase tracking-[0.12em] text-[#35598e] mb-2">Voting Flow</p>
                <p className="text-lg text-[#102347] font-semibold leading-snug">One person, one vote. Recorded in a controlled and auditable process.</p>
              </div>

              <div className="rounded-2xl border border-[#bfd1f8] bg-[#1f66f4] p-5 text-white">
                <p className="text-xs uppercase tracking-[0.12em] text-[#dbe8ff] mb-2">Governance Standard</p>
                <p className="text-lg font-semibold leading-snug">Transparent elections strengthen policy legitimacy and public trust.</p>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="section-wrap mt-16">
        <div className="glass-panel p-8 md:p-10">
          <div className="mb-8">
            <p className="eyebrow mb-4">
              <ClipboardCheck className="w-4 h-4" /> Steps To Use The Platform
            </p>
            <h2 className="text-3xl sm:text-4xl text-[#102347] mb-3">A clear, citizen-first voting journey</h2>
            <p className="text-[#5a6f95] max-w-3xl">From registration to final vote confirmation, each step is designed for integrity, accessibility, and accountability.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
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
              <p className="text-sm text-[#5d7298]">Authenticate once to access your official ballot securely.</p>
            </article>

            <article className="rounded-2xl border border-[#d3e0fb] p-5 bg-white">
              <p className="text-xs text-[#4f6793] uppercase tracking-[0.1em] mb-3">Step 03</p>
              <Vote className="w-6 h-6 text-[#1f66f4] mb-3" />
              <h3 className="text-xl text-[#102347] mb-2">Cast Your Vote</h3>
              <p className="text-sm text-[#5d7298]">Select your candidate and submit your decision in one trusted action.</p>
            </article>

            <article className="rounded-2xl border border-[#d3e0fb] p-5 bg-white">
              <p className="text-xs text-[#4f6793] uppercase tracking-[0.1em] mb-3">Step 04</p>
              <BadgeCheck className="w-6 h-6 text-[#1f66f4] mb-3" />
              <h3 className="text-xl text-[#102347] mb-2">Confirm Integrity</h3>
              <p className="text-sm text-[#5d7298]">Your account is marked as voted to prevent duplicate submissions.</p>
            </article>
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
              <p className="text-xs uppercase tracking-[0.12em] text-[#4f6793] mb-4">Institutional Reliability</p>
              <h3 className="text-3xl text-[#112851] mb-4">Make smarter civic decisions.</h3>
              <p className="text-[#5f7298] leading-relaxed">
                A mature voting platform should reduce friction for voters while increasing confidence for regulators,
                observers, and election administrators.
              </p>
            </div>

            <div className="mt-8">
              <Link to="/signup" className="btn-primary inline-flex items-center gap-2">
                Join The Election
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