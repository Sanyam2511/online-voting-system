import React, { useEffect, useMemo, useState } from 'react';
import { Activity, BadgeCheck, CalendarDays, LoaderCircle, PieChart as PieChartIcon, ShieldCheck } from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart as RechartsPieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import api from '../lib/api';
import transparencyIllustration from '../assets/illustrations/transparency-dashboard.svg';

const PARTY_COLORS = ['#1F66F4', '#2F7DFF', '#274A84', '#5A89F6', '#89AEEF', '#3A5F9C'];

const TransparencyDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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
        } else {
          setLoading(false);
        }
      } catch {
        setError('Unable to load transparency dashboard right now.');
        setLoading(false);
      }
    };

    fetchElections();
  }, []);

  useEffect(() => {
    const fetchDashboard = async () => {
      if (!selectedElectionId) {
        return;
      }

      setLoading(true);
      setError('');

      try {
        const response = await api.get('/vote/transparency', {
          params: {
            electionId: selectedElectionId
          }
        });
        setData(response.data);
      } catch {
        setError('Unable to load transparency dashboard right now.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [selectedElectionId]);

  const partyChartData = useMemo(() => {
    if (!data?.partyBreakdown?.length) {
      return [];
    }

    const totalVotes = data.summary?.totalVotesCast || data.partyBreakdown.reduce((sum, party) => sum + party.votes, 0);

    return data.partyBreakdown.map((party, index) => ({
      ...party,
      share: totalVotes > 0 ? Number(((party.votes / totalVotes) * 100).toFixed(1)) : 0,
      fill: PARTY_COLORS[index % PARTY_COLORS.length]
    }));
  }, [data]);

  const timelineData = useMemo(() => {
    if (!data?.turnoutTimeline?.length) {
      return [];
    }

    let runningTotal = 0;

    return data.turnoutTimeline.map((entry) => {
      runningTotal += entry.votes;

      return {
        date: entry.date,
        votes: entry.votes,
        cumulativeVotes: runningTotal
      };
    });
  }, [data]);

  return (
    <main className="min-h-screen pt-28 pb-16">
      <div className="section-wrap">
        <header className="glass-panel p-8 md:p-10 mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 items-center">
            <div>
              <p className="eyebrow mb-4">
                <ShieldCheck className="w-4 h-4" /> Public Transparency Dashboard
              </p>
              <h1 className="text-4xl sm:text-5xl text-[#102347] mb-2">Open Election Metrics</h1>
              <p className="text-[#5f7398] leading-relaxed max-w-3xl">
                Real-time visibility into turnout, candidate rankings, party vote share, and receipt-level verification activity.
              </p>

              <div className="mt-5 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-end max-w-2xl">
                <div>
                  <label htmlFor="transparency-election" className="block text-xs uppercase tracking-[0.12em] text-[#5f7398] mb-2">
                    Election Scope
                  </label>
                  <select
                    id="transparency-election"
                    className="form-field"
                    value={selectedElectionId}
                    onChange={(event) => setSelectedElectionId(event.target.value)}
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
                      <CalendarDays className="w-4 h-4" /> {selectedElection.status}
                    </p>
                  </div>
                )}
              </div>
            </div>
            <div className="rounded-2xl border border-[#c8d8f6] bg-white overflow-hidden">
              <img
                src={transparencyIllustration}
                alt="Election transparency analytics"
                className="w-full h-44 object-cover"
                loading="lazy"
              />
            </div>
          </div>
        </header>

        {loading ? (
          <div className="surface-card p-12 text-center">
            <LoaderCircle className="w-8 h-8 animate-spin text-[#1f66f4] mx-auto mb-3" />
            <p className="text-[#5d7298]">Loading transparency metrics...</p>
          </div>
        ) : elections.length === 0 ? (
          <div className="surface-card p-6 border border-[#d3e0fb] bg-[#f7fbff]">
            <p className="text-[#4b6796]">No election is available for transparency analytics yet.</p>
          </div>
        ) : error ? (
          <div className="surface-card p-6 border border-[#f1c6c6] bg-[#fff1f1]">
            <p className="text-[#a43a3a]">{error}</p>
          </div>
        ) : (
          <>
            <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 mb-8">
              <div className="surface-card p-5">
                <p className="text-xs uppercase tracking-[0.1em] text-[#62769d] mb-2">Election</p>
                <p className="text-sm font-semibold text-[#12305f]">{data.summary.electionName}</p>
              </div>
              <div className="surface-card p-5">
                <p className="text-xs uppercase tracking-[0.1em] text-[#62769d] mb-2">Registered Voters</p>
                <p className="text-2xl font-semibold text-[#12305f]">{data.summary.totalRegisteredVoters}</p>
              </div>
              <div className="surface-card p-5">
                <p className="text-xs uppercase tracking-[0.1em] text-[#62769d] mb-2">Votes Cast</p>
                <p className="text-2xl font-semibold text-[#12305f]">{data.summary.totalVotesCast}</p>
              </div>
              <div className="surface-card p-5">
                <p className="text-xs uppercase tracking-[0.1em] text-[#62769d] mb-2">Turnout</p>
                <p className="text-2xl font-semibold text-[#12305f]">{data.summary.turnoutPercentage}%</p>
              </div>
              <div className="surface-card p-5">
                <p className="text-xs uppercase tracking-[0.1em] text-[#62769d] mb-2">Active Parties</p>
                <p className="text-2xl font-semibold text-[#12305f]">{data.summary.totalParties}</p>
              </div>
            </section>

            <section className="mb-8">
              <article className="surface-card p-6">
                <h2 className="text-2xl text-[#102347] mb-4">Election Result Calculation</h2>
                <p className="text-sm text-[#5d7298] mb-5">
                  Each election below shows the top 3 candidates and total votes cast for dynamic result tracking.
                </p>

                {!data.electionResults || data.electionResults.length === 0 ? (
                  <p className="text-sm text-[#60759b]">No election result data available yet.</p>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {data.electionResults.map((result) => (
                      <div key={result.electionName} className="rounded-2xl border border-[#d5e1f5] bg-white p-4">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div>
                            <p className="text-sm text-[#60759b]">Election</p>
                            <p className="text-lg font-semibold text-[#12305d]">{result.electionName}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs uppercase tracking-[0.08em] text-[#6980a7]">Total Votes Cast</p>
                            <p className="text-xl font-semibold text-[#12305f]">{result.totalVotesCast}</p>
                          </div>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-left border-b border-[#e3ebfa]">
                                <th className="pb-2 text-[#6d82a8] font-semibold">Rank</th>
                                <th className="pb-2 text-[#6d82a8] font-semibold">Candidate</th>
                                <th className="pb-2 text-[#6d82a8] font-semibold">Party</th>
                                <th className="pb-2 text-[#6d82a8] font-semibold">Votes</th>
                              </tr>
                            </thead>
                            <tbody>
                              {result.topCandidates.map((candidate, index) => (
                                <tr key={`${result.electionName}-${candidate._id}`} className="border-b border-[#edf2fb]">
                                  <td className="py-2 text-[#345584]">#{index + 1}</td>
                                  <td className="py-2 text-[#12305d] font-semibold">{candidate.name}</td>
                                  <td className="py-2 text-[#567098]">{candidate.party}</td>
                                  <td className="py-2 text-[#12305d]">{candidate.voteCount}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-6 mb-8">
              <article className="surface-card p-6">
                <div className="flex items-center gap-2 mb-5">
                  <PieChartIcon className="w-5 h-5 text-[#1f66f4]" />
                  <h2 className="text-2xl text-[#102347]">Party Vote Share</h2>
                </div>

                {partyChartData.length === 0 ? (
                  <p className="text-sm text-[#60759b]">No party vote share data available.</p>
                ) : (
                  <div className="grid grid-cols-1 xl:grid-cols-[290px_1fr] gap-4 items-center">
                    <div className="h-[260px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPieChart>
                          <Pie
                            data={partyChartData}
                            dataKey="votes"
                            nameKey="party"
                            innerRadius={62}
                            outerRadius={98}
                            paddingAngle={3}
                            stroke="#eef4ff"
                            strokeWidth={2}
                          >
                            {partyChartData.map((entry) => (
                              <Cell key={`cell-${entry.party}`} fill={entry.fill} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value, _name, payload) => [
                              `${value} votes (${payload?.payload?.share || 0}%)`,
                              payload?.payload?.party || 'Party'
                            ]}
                            contentStyle={{
                              backgroundColor: '#11284f',
                              border: '1px solid #35598e',
                              borderRadius: '12px',
                              color: '#eaf1ff'
                            }}
                            itemStyle={{ color: '#eaf1ff' }}
                            labelStyle={{ color: '#eaf1ff' }}
                          />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="space-y-3">
                      {partyChartData.map((party) => (
                        <div key={party.party} className="rounded-xl border border-[#dce6fa] bg-[#f9fbff] p-3">
                          <div className="flex items-center justify-between text-sm mb-1.5 gap-2">
                            <p className="text-[#12305f] font-semibold inline-flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: party.fill }}></span>
                              {party.party}
                            </p>
                            <p className="text-[#60759b] text-right">{party.votes} votes ({party.share}%)</p>
                          </div>
                          <div className="w-full h-2.5 rounded-full bg-[#e6eefc] overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${party.share}%`, backgroundColor: party.fill }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </article>

              <article className="glass-panel p-6">
                <div className="flex items-center gap-2 mb-5">
                  <Activity className="w-5 h-5 text-[#1f66f4]" />
                  <h2 className="text-2xl text-[#102347]">Turnout Timeline</h2>
                </div>

                {timelineData.length === 0 ? (
                  <p className="text-sm text-[#60759b]">No turnout events recorded yet.</p>
                ) : (
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={timelineData} margin={{ top: 8, right: 10, left: -8, bottom: 0 }}>
                        <defs>
                          <linearGradient id="turnoutGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2f7dff" stopOpacity={0.45} />
                            <stop offset="95%" stopColor="#2f7dff" stopOpacity={0.06} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="4 6" stroke="#dce6fa" />
                        <XAxis
                          dataKey="date"
                          tick={{ fill: '#5b7398', fontSize: 12 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          allowDecimals={false}
                          tick={{ fill: '#5b7398', fontSize: 12 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          formatter={(value, name) => [
                            `${value} votes`,
                            name === 'cumulativeVotes' ? 'Cumulative Turnout' : 'Votes On Date'
                          ]}
                          contentStyle={{
                            backgroundColor: '#11284f',
                            border: '1px solid #35598e',
                            borderRadius: '12px',
                            color: '#eaf1ff'
                          }}
                          itemStyle={{ color: '#eaf1ff' }}
                          labelStyle={{ color: '#eaf1ff' }}
                        />
                        <Area
                          type="monotone"
                          dataKey="cumulativeVotes"
                          stroke="#1f66f4"
                          strokeWidth={3}
                          fill="url(#turnoutGradient)"
                          dot={{ r: 4, stroke: '#ffffff', strokeWidth: 2, fill: '#1f66f4' }}
                          activeDot={{ r: 6, fill: '#1f66f4' }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </article>
            </section>

            <section className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6">
              <article className="surface-card p-6">
                <h2 className="text-2xl text-[#102347] mb-4">Candidate Ranking</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left border-b border-[#d5e0f4]">
                        <th className="pb-3 text-[#6980a7] font-semibold">Candidate</th>
                        <th className="pb-3 text-[#6980a7] font-semibold">Party</th>
                        <th className="pb-3 text-[#6980a7] font-semibold">Votes</th>
                        <th className="pb-3 text-[#6980a7] font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.candidateRanking.map((candidate) => (
                        <tr key={candidate._id} className="border-b border-[#edf2fb]">
                          <td className="py-3 text-[#14305f] font-semibold">{candidate.name}</td>
                          <td className="py-3 text-[#567098]">{candidate.party}</td>
                          <td className="py-3 text-[#14305f]">{candidate.voteCount}</td>
                          <td className="py-3">
                            {candidate.isVerified ? (
                              <span className="inline-flex items-center gap-1 text-xs rounded-full px-2.5 py-1 bg-[#e9f3ff] text-[#1f66f4] border border-[#bfd2f8]">
                                <BadgeCheck className="w-3.5 h-3.5" /> Verified
                              </span>
                            ) : (
                              <span className="text-xs text-[#7d8da8]">Unverified</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>

              <article className="glass-panel p-6">
                <h2 className="text-2xl text-[#102347] mb-4">Recent Verified Receipts</h2>
                <div className="space-y-3">
                  {data.recentReceipts.length === 0 ? (
                    <p className="text-sm text-[#60759b]">No verified receipts yet.</p>
                  ) : (
                    data.recentReceipts.map((receipt) => (
                      <div key={receipt.receiptCode} className="rounded-2xl border border-[#ccdaf4] bg-white p-3.5">
                        <p className="text-xs text-[#5f7398]">{receipt.electionName}</p>
                        <p className="text-sm font-semibold text-[#12305d] mt-1">{receipt.receiptCode}</p>
                        <p className="text-xs text-[#58719a] mt-1">
                          {receipt.candidate ? `${receipt.candidate.name} • ${receipt.candidate.party}` : 'Candidate hidden'}
                        </p>
                        <p className="text-xs mt-1 text-[#1f66f4] font-semibold uppercase">{receipt.status}</p>
                      </div>
                    ))
                  )}
                </div>
              </article>
            </section>
          </>
        )}
      </div>
    </main>
  );
};

export default TransparencyDashboard;
