import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ShieldCheck,
  BarChart3,
  Users,
  Activity,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import api from '../lib/api';
import torusImage from '../assets/illustrations/torus.png';

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
    const statusCounts = { live: 0, counting: 0, draft: 0, registration: 0, audited: 0, published: 0, archived: 0 };
    elections.forEach((election) => {
      const statusKey = election.status || 'draft';
      if (Object.prototype.hasOwnProperty.call(statusCounts, statusKey)) {
        statusCounts[statusKey] += 1;
      }
    });

    return {
      totalElections: elections.length,
      totalElectionVotes: elections.reduce((sum, election) => sum + Number(election.totalVotesCast || 0), 0),
      statusCounts
    };
  }, [elections]);

  return (
    <main className="min-h-screen pt-28 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Two-Panel Hero */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Left Panel */}
          <div className="bento-card relative overflow-hidden flex flex-col justify-center min-h-[500px] p-8 md:p-12">
            <img src={torusImage} alt="Glossy Torus" className="absolute top-8 right-8 w-32 h-32 object-contain opacity-90 drop-shadow-2xl animate-pulse" />
            
            <div className="relative z-10 max-w-lg mt-8">
              <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight mb-6 text-slate-900">
                Every vote, <br/>
                <span className="italic text-emerald-600">verified.</span>
              </h1>
              <p className="text-lg text-slate-600 mb-8 max-w-md">
                Secure, transparent, and effortlessly accessible. The next-generation civic voting platform trusted by modern institutions.
              </p>
              <div className="flex gap-4 items-center mb-16">
                <Link to={'/signup'} className="btn-black-pill gap-2">
                  Sign Up <ArrowRight className="w-4 h-4" />
                </Link>
                <Link to={'/vote'} className="text-sm font-semibold text-slate-700 hover:text-emerald-600 transition-colors">
                  Open Ballot Arena &rarr;
                </Link>
              </div>
            </div>

            {/* Embedded Mini Dashboard Preview */}
            <div className="absolute bottom-6 right-6 left-6 md:left-auto md:w-80 bg-slate-50 border border-slate-100 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Live Turnout</span>
                <span className="flex items-center gap-1 text-emerald-600 text-xs font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span> Live
                </span>
              </div>
              <div className="flex items-end gap-3">
                <div className="text-3xl font-bold font-display text-slate-900">{stats ? `${stats.turnoutPercentage}%` : '...'}</div>
                <div className="w-full bg-slate-200 rounded-full h-2 mb-2">
                  <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${stats?.turnoutPercentage || 0}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel */}
          <div className="bento-accent-card flex flex-col justify-end p-8 md:p-12 min-h-[500px] relative overflow-hidden bg-emerald-600">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-500 rounded-full blur-3xl opacity-50"></div>
            
            <div className="relative z-10">
              <h2 className="font-display text-5xl md:text-6xl font-bold italic text-white mb-4 leading-tight">
                Trusted by <br/> millions.
              </h2>
              <p className="text-emerald-50 text-lg max-w-sm mb-6">
                Redefining digital trust with cryptographic receipts and uncompromising transparency.
              </p>
              
              <div className="grid grid-cols-2 gap-4 border-t border-emerald-400/30 pt-6">
                <div>
                  <p className="text-emerald-100 text-xs uppercase tracking-widest font-semibold mb-1">Votes Cast</p>
                  <p className="text-3xl font-bold text-white">{countValue(electionSummary.totalElectionVotes)}</p>
                </div>
                <div>
                  <p className="text-emerald-100 text-xs uppercase tracking-widest font-semibold mb-1">Active Elections</p>
                  <p className="text-3xl font-bold text-white">{electionSummary.statusCounts.live}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Asymmetric Bento Grid */}
        <section className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          
          {/* Card 1: Rhetorical Question (Span 2) */}
          <div className="bento-card col-span-1 md:col-span-2 flex flex-col justify-center items-start p-8 bg-slate-900 text-white">
            <h3 className="font-display text-3xl md:text-4xl italic font-bold mb-4 text-white">
              Ready to trust your vote?
            </h3>
            <p className="text-slate-300 text-sm mb-6 max-w-md leading-relaxed">
              Our verifiable receipt system ensures your vote is cast exactly as intended, and counted exactly as cast.
            </p>
            <Link to={'/receipt'} className="inline-flex items-center justify-center bg-white text-slate-900 rounded-full px-5 py-2 text-sm font-semibold hover:bg-slate-100 transition-colors">
              Verify a Receipt
            </Link>
          </div>

          {/* Card 2: Live Election Overview (Span 2) */}
          <div className="bento-card col-span-1 md:col-span-2 lg:col-span-2 flex flex-col p-6">
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-6 flex items-center gap-2">
              <Activity className="w-4 h-4" /> Live Overview
            </h4>
            <div className="space-y-4 flex-1">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div>
                  <p className="font-semibold text-slate-900">Voter Turnout</p>
                  <p className="text-xs text-slate-500">Overall participation</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-lg">{stats?.turnoutPercentage || 0}%</span>
                  <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-1 rounded font-bold">GOOD</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div>
                  <p className="font-semibold text-slate-900">Dispute Rate</p>
                  <p className="text-xs text-slate-500">Active verification flags</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-lg">0.2%</span>
                  <span className="bg-amber-100 text-amber-700 text-xs px-2 py-1 rounded font-bold">ATTENTION</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Advanced Analytics */}
          <div className="bento-card col-span-1 md:col-span-2 lg:col-span-1 flex flex-col p-6 relative overflow-hidden">
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">
              Advanced Analytics
            </h4>
            <div className="flex-1 flex items-center justify-center relative">
              <div className="w-32 h-32 rounded-full border-[12px] border-emerald-500 border-r-slate-100 transform rotate-45 relative">
                <div className="absolute inset-0 flex items-center justify-center -rotate-45">
                  <span className="text-2xl font-bold text-slate-900">75%</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-slate-500 text-center mt-4">Verified vote density</p>
          </div>

          {/* Card 4: Governance Flow (Accent) */}
          <div className="bento-accent-card col-span-1 md:col-span-2 lg:col-span-1 p-6 flex flex-col justify-between">
            <div>
              <ShieldCheck className="w-8 h-8 text-emerald-100 mb-4" />
              <h4 className="font-display text-2xl font-bold mb-2">Governance Flow</h4>
              <p className="text-emerald-50 text-sm mb-6">Automated lifecycle from draft to verified archive.</p>
            </div>
            <div className="space-y-2">
              <div className="flex gap-2 items-center text-sm text-white font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-200" /> Transparent Counting
              </div>
              <div className="flex gap-2 items-center text-sm text-white font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-200" /> Cryptographic Receipts
              </div>
            </div>
          </div>

          {/* Card 5: Candidate Comparison */}
          <div className="bento-card col-span-1 md:col-span-3 lg:col-span-2 flex flex-col p-6">
            <div className="flex justify-between items-end mb-6">
              <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Users className="w-4 h-4" /> Candidate Activity
              </h4>
              <Link to={'/candidates'} className="text-xs font-semibold text-emerald-600 hover:underline">
                View all profiles
              </Link>
            </div>
            <div className="flex items-end justify-around h-32 border-b border-slate-100 pb-2 mb-4">
              <div className="w-12 bg-slate-200 rounded-t-lg h-[40%]"></div>
              <div className="w-12 bg-emerald-500 rounded-t-lg h-[85%] relative">
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-emerald-100 border-2 border-white flex items-center justify-center text-xs font-bold text-emerald-700">A</div>
              </div>
              <div className="w-12 bg-slate-200 rounded-t-lg h-[60%]"></div>
              <div className="w-12 bg-slate-200 rounded-t-lg h-[30%]"></div>
            </div>
            <p className="text-xs text-slate-500 text-center">Top candidates by engagement metric</p>
          </div>

        </section>

      </div>
    </main>
  );
};

export default Home;