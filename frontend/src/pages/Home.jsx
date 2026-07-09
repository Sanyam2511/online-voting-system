import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  ArrowUpRight,
  Globe2,
  Fingerprint,
  Lock,
  Zap,
  UserX,
  Code2,
  Network
} from 'lucide-react';

const Home = () => {
  return (
    <main className="min-h-screen pt-28 pb-20 bg-slate-950 selection:bg-emerald-500/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section 1: Sparse Hero Bento Grid */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-32">
          
          {/* Card 1: Main Left Hero */}
          <div className="bento-card lg:col-span-8 flex flex-col justify-between p-8 md:p-14 relative overflow-hidden group min-h-[500px] border-slate-800 bg-slate-900">
            <div className="absolute inset-0">
              <img src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80" alt="Corporate" className="w-full h-full object-cover opacity-30 mix-blend-luminosity group-hover:scale-105 transition-transform duration-1000" />
              <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/80 to-transparent"></div>
            </div>

            <div className="relative z-10 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-950 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-widest mb-12 backdrop-blur-md shadow-[0_0_20px_rgba(16,185,129,0.15)]">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Next-Gen Governance
              </div>
              <h1 className="font-display text-5xl md:text-7xl font-bold leading-[1.05] tracking-tight mb-8 text-white">
                Every vote, <br/>
                <span className="italic font-normal text-emerald-400">securely verified.</span>
              </h1>
              <p className="text-lg md:text-xl text-slate-300 mb-12 max-w-lg leading-relaxed font-light">
                The modern standard for digital civic participation. End-to-end cryptographic transparency designed for high-trust institutions.
              </p>
              <div className="flex flex-wrap gap-4 items-center">
                <Link to={'/signup'} className="btn-black-pill bg-white text-slate-950 hover:bg-emerald-50 gap-2 px-8 py-4 text-base shadow-xl shadow-emerald-900/10 transition-all hover:scale-[1.02]">
                  Enter Platform <ArrowRight className="w-5 h-5" />
                </Link>
                <Link to={'/vote'} className="text-sm font-semibold text-slate-400 hover:text-emerald-400 transition-colors uppercase tracking-widest flex items-center gap-2">
                  View Ballots <ArrowUpRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            
            {/* Card 2: Engineered for Trust */}
            <div className="bento-accent-card flex-1 flex flex-col justify-end p-8 md:p-10 relative overflow-hidden group bg-emerald-600 min-h-[300px]">
              <div className="absolute inset-0">
                <img src="https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?auto=format&fit=crop&q=80" alt="People gathering" className="w-full h-full object-cover mix-blend-overlay opacity-40 group-hover:scale-105 transition-transform duration-1000" />
                <div className="absolute inset-0 bg-gradient-to-t from-emerald-900/95 via-emerald-800/60 to-transparent"></div>
              </div>
              
              <div className="relative z-10">
                <Globe2 className="w-10 h-10 text-emerald-300 mb-6 opacity-80" />
                <h2 className="font-display text-4xl md:text-5xl font-bold italic text-white mb-4 leading-tight shadow-emerald-900">
                  Built for trust.
                </h2>
                <p className="text-emerald-50 text-base leading-relaxed font-light">
                  Redefining digital integrity with uncompromising architecture.
                </p>
              </div>
            </div>

            {/* Card 3: Meaningful Live Network Status */}
            <div className="bento-card flex flex-col p-8 relative overflow-hidden group bg-slate-900 min-h-[180px] border-slate-800">
              <div className="absolute top-6 right-6 flex items-center gap-2 bg-emerald-950/60 px-3 py-1.5 rounded-full border border-emerald-500/20 backdrop-blur-sm">
                <div className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400">Live Network</span>
              </div>
              
              <div className="mt-auto relative z-10">
                <div className="flex items-baseline gap-2 mb-2">
                  <h3 className="font-display text-4xl font-bold text-white tracking-tight">12<span className="text-2xl text-slate-400 font-sans">ms</span></h3>
                </div>
                <p className="text-slate-400 text-sm font-light">Global cryptographic consensus latency.</p>
                
                {/* Visual Data Bar */}
                <div className="mt-5 flex gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                  {[...Array(12)].map((_, i) => (
                    <div key={i} className={`h-1.5 flex-1 rounded-full ${i > 8 ? 'bg-slate-800' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'} ${i === 8 ? 'animate-pulse bg-emerald-400' : ''} ${i === 9 ? 'animate-pulse delay-75 bg-slate-700' : ''}`}></div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </section>


        {/* Section 2: Core Pillars */}
        <section className="mb-32 relative rounded-[3rem] p-8 md:p-16 lg:p-24 overflow-hidden bg-slate-900/50 border border-slate-800 shadow-2xl">
          <div className="absolute inset-0">
            <img src="https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80" alt="Tech background" className="w-full h-full object-cover opacity-20 mix-blend-screen" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none"></div>
            <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-[2px]"></div>
          </div>
          
          <div className="relative z-10">
            <div className="text-center max-w-3xl mx-auto mb-20">
              <h2 className="font-display text-5xl md:text-7xl font-bold mb-6 text-white leading-tight">Uncompromising <br/><span className="italic text-emerald-400 font-light">Integrity.</span></h2>
              <p className="text-xl text-slate-400 font-light">Built from the ground up to support high-stakes civic elections with mathematical certainty.</p>
            </div>
            
            <div className="relative max-w-5xl mx-auto flex flex-col md:block md:h-[650px] space-y-6 md:space-y-0">
              
              <div className="md:absolute md:top-0 md:left-4 md:w-[400px] bg-slate-900/40 backdrop-blur-2xl border border-white/5 p-8 rounded-3xl shadow-2xl transform transition-transform duration-500 hover:-translate-y-4 hover:border-emerald-500/30 group">
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center mb-6 border border-emerald-500/20 group-hover:scale-110 transition-transform">
                  <UserX className="w-6 h-6 text-emerald-400" />
                </div>
                <h3 className="font-display text-3xl font-bold mb-4 text-white">Ghost Protocol</h3>
                <p className="text-slate-400 font-light leading-relaxed group-hover:text-slate-300 transition-colors">
                  Total voter anonymity cryptographically guaranteed by default. No one can ever link your identity to your ballot once cast.
                </p>
              </div>
              
              <div className="md:absolute md:top-[180px] md:right-4 md:w-[420px] bg-slate-900/60 backdrop-blur-3xl border border-emerald-500/20 p-8 rounded-3xl shadow-[0_0_50px_rgba(16,185,129,0.05)] transform transition-transform duration-500 hover:-translate-y-4 hover:border-emerald-400 z-20 group">
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center mb-6 border border-emerald-500/30 group-hover:scale-110 transition-transform">
                  <Code2 className="w-6 h-6 text-emerald-400" />
                </div>
                <h3 className="font-display text-3xl font-bold mb-4 text-white">Open Source Core</h3>
                <p className="text-slate-400 font-light leading-relaxed group-hover:text-slate-300 transition-colors">
                  Code you can trust, audited by security researchers globally. Our platform thrives on transparency and community oversight.
                </p>
              </div>

              <div className="md:absolute md:bottom-0 md:left-[120px] md:w-[400px] bg-slate-900/40 backdrop-blur-2xl border border-white/5 p-8 rounded-3xl shadow-2xl transform transition-transform duration-500 hover:-translate-y-4 hover:border-indigo-500/30 z-10 group">
                <div className="w-14 h-14 rounded-full bg-indigo-500/10 flex items-center justify-center mb-6 border border-indigo-500/20 group-hover:scale-110 transition-transform">
                  <Network className="w-6 h-6 text-indigo-400" />
                </div>
                <h3 className="font-display text-3xl font-bold mb-4 text-white">Decentralized Nodes</h3>
                <p className="text-slate-400 font-light leading-relaxed group-hover:text-slate-300 transition-colors">
                  No single point of failure. Election data is distributed across a robust network of independent nodes ensuring 100% uptime.
                </p>
              </div>

            </div>
          </div>
        </section>


        {/* Section 3: Security & Auditing Split-View */}
        <section className="mb-32 flex flex-col lg:flex-row items-center gap-16 overflow-hidden relative">
          
          <div className="lg:w-1/2 relative z-10 px-4">
            <h2 className="font-display text-5xl md:text-7xl font-bold mb-6 leading-tight text-white">Publicly <br/><span className="text-slate-500 italic font-light">Auditable.</span></h2>
            <p className="text-slate-400 text-lg mb-8 leading-relaxed font-light">
              Anyone can independently verify the election tally without compromising voter anonymity, using our zero-knowledge proofs.
            </p>
            <ul className="space-y-5">
              <li className="flex items-center gap-4 font-medium text-slate-300 text-lg">
                <div className="p-2 bg-emerald-950/50 border border-emerald-900 rounded-full"><CheckCircle2 className="w-5 h-5 text-emerald-400" /></div> Independent Verification
              </li>
              <li className="flex items-center gap-4 font-medium text-slate-300 text-lg">
                <div className="p-2 bg-emerald-950/50 border border-emerald-900 rounded-full"><CheckCircle2 className="w-5 h-5 text-emerald-400" /></div> Tamper-Proof Ledgers
              </li>
              <li className="flex items-center gap-4 font-medium text-slate-300 text-lg">
                <div className="p-2 bg-emerald-950/50 border border-emerald-900 rounded-full"><CheckCircle2 className="w-5 h-5 text-emerald-400" /></div> Real-Time Results
              </li>
            </ul>
          </div>
          
          <div className="lg:w-1/2 relative z-10 w-full">
            <div className="bg-slate-900 rounded-3xl p-8 md:p-12 shadow-2xl transform lg:-rotate-2 hover:rotate-0 transition-transform duration-500 relative overflow-hidden group border border-slate-800">
               <div className="absolute inset-0">
                 <img src="https://images.unsplash.com/photo-1639322537228-f710d846310a?auto=format&fit=crop&q=80" alt="Blockchain" className="w-full h-full object-cover opacity-20 mix-blend-luminosity group-hover:scale-105 transition-transform duration-1000" />
                 <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/80 to-transparent"></div>
               </div>
              <div className="relative z-10">
                <Fingerprint className="w-14 h-14 text-emerald-400 mb-6" />
                <h4 className="font-display text-4xl font-bold mb-4 text-white">Immutable Receipts</h4>
                <p className="text-slate-400 text-lg mb-10 font-light leading-relaxed">
                  Track your exact vote through the decentralized ledger. Verify that it was counted exactly as cast, all from a simple, secure portal.
                </p>
                <Link to="/receipt" className="btn-black-pill bg-white text-slate-900 hover:bg-emerald-50 w-full justify-center py-4 text-sm tracking-widest uppercase shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                  Verify a Receipt
                </Link>
              </div>
            </div>
          </div>
        </section>


        {/* Section 4: Call to Action */}
        <section className="text-center max-w-3xl mx-auto mb-20 bg-slate-900 p-12 rounded-[3rem] border border-slate-800 shadow-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
          
          <div className="relative z-10">
            <ShieldCheck className="w-16 h-16 text-emerald-500 mx-auto mb-8" />
            <h2 className="font-display text-5xl md:text-6xl font-bold mb-6 text-white">Ready to modernize?</h2>
            <p className="text-xl text-slate-400 mb-10 font-light leading-relaxed">
              Join the thousands of institutions leveraging our next-generation governance platform to run secure, transparent elections.
            </p>
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
              <Link to="/signup" className="btn-black-pill bg-white text-slate-950 hover:bg-emerald-50 px-10 py-5 text-lg shadow-[0_0_20px_rgba(255,255,255,0.15)] w-full sm:w-auto justify-center transition-transform hover:scale-[1.02]">
                Create Organization
              </Link>
              <Link to="/vote" className="px-10 py-5 text-lg font-semibold text-slate-400 hover:text-emerald-400 transition-colors w-full sm:w-auto text-center border border-transparent hover:border-slate-800 rounded-full">
                Enter Ballot Arena &rarr;
              </Link>
            </div>
          </div>
        </section>

      </div>
    </main>
  );
};

export default Home;