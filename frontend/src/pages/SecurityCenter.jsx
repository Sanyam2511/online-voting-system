import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarDays, LoaderCircle, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { clearAuthSession, getAuthToken } from '../lib/auth';
import { formatDateTime } from '../lib/formatting';
import ThemedSelect from '../components/ThemedSelect';
import { useUiPreferences } from '../context/useUiPreferences';

const severityPillClass = (severity) => {
  if (severity === 'critical') {
    return 'bg-slate-50 text-slate-700 border-slate-200';
  }

  if (severity === 'high') {
    return 'bg-red-50 text-slate-700 border-slate-200';
  }

  if (severity === 'medium') {
    return 'bg-slate-50 text-slate-700 border-slate-200';
  }

  if (severity === 'low') {
    return 'bg-slate-50 text-emerald-600 border-slate-200';
  }

  return 'bg-slate-50 text-slate-700 border-slate-200';
};

const SecurityCenter = () => {
  const navigate = useNavigate();
  

  const severityOptions = [
    { value: 'all', label: 'All Severity' },
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'critical', label: 'Critical' }
  ];

  const [bootLoading, setBootLoading] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [error, setError] = useState('');

  const [isAdmin, setIsAdmin] = useState(false);
  const [profile, setProfile] = useState(null);

  const [elections, setElections] = useState([]);
  const [selectedElectionId, setSelectedElectionId] = useState('');

  const [selectedSeverity, setSelectedSeverity] = useState('all');
  const [selectedEventType, setSelectedEventType] = useState('all');

  const [overview, setOverview] = useState(null);
  const [recentAnomalies, setRecentAnomalies] = useState([]);
  const [events, setEvents] = useState([]);

  const eventTypeOptions = useMemo(() => {
    const dynamic = (overview?.summary?.eventTypeCounts || []).map((entry) => ({
      value: entry.eventType,
      label: entry.eventType
    }));

    return [
      { value: 'all', label: 'All Event Types' },
      ...dynamic
    ];
  }, [overview]);

  useEffect(() => {
    const bootstrap = async () => {
      if (!getAuthToken()) {
        navigate('/login');
        return;
      }

      setBootLoading(true);
      setError('');

      try {
        const [meResponse, electionsResponse] = await Promise.all([
          api.get('/auth/me'),
          api.get('/vote/elections/public')
        ]);

        const me = meResponse.data;
        setProfile(me);
        setIsAdmin(me?.role === 'Admin');

        const electionList = electionsResponse.data?.elections || [];
        setElections(electionList);

        if (electionList.length > 0) {
          const liveElection = electionList.find((entry) => entry.status === 'live');
          setSelectedElectionId(liveElection?._id || electionList[0]._id);
        }
      } catch (requestError) {
        if (requestError.response?.status === 401) {
          clearAuthSession();
          navigate('/login');
          return;
        }

        setError('Unable to load security center right now.');
      } finally {
        setBootLoading(false);
      }
    };

    bootstrap();
  }, [navigate]);

  useEffect(() => {
    const loadSecurityData = async () => {
      if (bootLoading || !isAdmin) {
        return;
      }

      setLoadingEvents(true);
      setError('');

      const params = {
        electionId: selectedElectionId || undefined
      };

      const eventParams = {
        electionId: selectedElectionId || undefined,
        anomalyOnly: true,
        limit: 70,
        severity: selectedSeverity !== 'all' ? selectedSeverity : undefined,
        eventType: selectedEventType !== 'all' ? selectedEventType : undefined
      };

      try {
        const [overviewResponse, eventsResponse] = await Promise.all([
          api.get('/security/overview', { params }),
          api.get('/security/events', { params: eventParams })
        ]);

        setOverview(overviewResponse.data || null);
        setRecentAnomalies(overviewResponse.data?.recentAnomalies || []);
        setEvents(eventsResponse.data?.events || []);
      } catch (requestError) {
        if (requestError.response?.status === 401) {
          clearAuthSession();
          navigate('/login');
          return;
        }

        if (requestError.response?.status === 403) {
          setError('Security center is restricted to admin users.');
        } else {
          setError(requestError.response?.data?.message || 'Failed to load security telemetry.');
        }
      } finally {
        setLoadingEvents(false);
      }
    };

    loadSecurityData();
  }, [bootLoading, isAdmin, navigate, selectedElectionId, selectedSeverity, selectedEventType]);

  if (bootLoading) {
    return (
      <main className="min-h-screen page-shell pt-20 pb-14">
        <div className="section-wrap">
          <section className="bento-card p-8 text-center">
            <LoaderCircle className="w-7 h-7 animate-spin text-emerald-600 mx-auto mb-3" />
            <p className="text-sm text-slate-700">{'Loading security monitoring center...'}</p>
          </section>
        </div>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="min-h-screen page-shell pt-20 pb-14">
        <div className="section-wrap">
          <section className="bento-card p-8 text-center">
            <AlertTriangle className="w-7 h-7 text-slate-700 mx-auto mb-3" />
            <h1 className="font-display text-2xl text-slate-900 mb-2">{'Admin Access Required'}</h1>
            <p className="text-sm text-slate-700">
              {'This module is available only for election security administrators.'}
            </p>
          </section>
        </div>
      </main>
    );
  }

  const summary = overview?.summary || {
    totalEvents: 0,
    totalAnomalies: 0,
    anomaliesInWindow: 0,
    severityCounts: { info: 0, low: 0, medium: 0, high: 0, critical: 0 }
  };

  return (
    <main className="min-h-screen page-shell pt-20 pb-14">
      <div className="section-wrap space-y-6">
        <header className="bento-card p-6 md:p-7">
          <p className="eyebrow mb-4">
            <ShieldCheck className="w-4 h-4" /> {'Risk and Integrity Monitoring'}
          </p>
          <h1 className="font-display text-2xl sm:text-3xl text-slate-900 mb-2">{'Security Monitoring Center'}</h1>
          <p className="text-slate-500 max-w-3xl">
            {'Monitor anomaly signals across voter verification, vote bursts, and admin activity.'}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="metric-pill">{'Operator'}: {profile?.name || 'Admin'}</span>
            <span className="metric-pill">{'Total Events'}: {summary.totalEvents}</span>
            <span className="metric-pill">{'Total Anomalies'}: {summary.totalAnomalies}</span>
            <span className="metric-pill">{'24h Anomalies'}: {summary.anomaliesInWindow}</span>
          </div>
        </header>

        {error && (
          <div className="bento-card p-4 border border-red-200 bg-red-50 text-red-600">
            <p className="text-sm">{error}</p>
          </div>
        )}

        <section className="border-slate-200 pb-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label htmlFor="security-election-filter" className="block text-xs uppercase tracking-[0.1em] text-slate-500 mb-2">
                {'Election Scope'}
              </label>
              <ThemedSelect
                id="security-election-filter"
                value={selectedElectionId}
                onValueChange={setSelectedElectionId}
                options={elections.map((election) => ({ value: election._id, label: election.name }))}
                placeholder={elections.length === 0 ? 'No elections available' : 'Select election'}
              />
            </div>

            <div>
              <label htmlFor="security-severity-filter" className="block text-xs uppercase tracking-[0.1em] text-slate-500 mb-2">
                {'Severity'}
              </label>
              <ThemedSelect
                id="security-severity-filter"
                value={selectedSeverity}
                onValueChange={setSelectedSeverity}
                options={severityOptions}
              />
            </div>

            <div>
              <label htmlFor="security-event-type-filter" className="block text-xs uppercase tracking-[0.1em] text-slate-500 mb-2">
                {'Event Type'}
              </label>
              <ThemedSelect
                id="security-event-type-filter"
                value={selectedEventType}
                onValueChange={setSelectedEventType}
                options={eventTypeOptions}
              />
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <article className="border-slate-200 pl-4 py-2">
            <p className="text-xs uppercase tracking-[0.1em] text-slate-700 mb-2">{'Low'}</p>
            <p className="text-2xl text-slate-900 font-semibold">{summary.severityCounts?.low || 0}</p>
          </article>
          <article className="border-slate-200 pl-4 py-2">
            <p className="text-xs uppercase tracking-[0.1em] text-slate-700 mb-2">{'Medium'}</p>
            <p className="text-2xl text-slate-900 font-semibold">{summary.severityCounts?.medium || 0}</p>
          </article>
          <article className="border-slate-200 pl-4 py-2">
            <p className="text-xs uppercase tracking-[0.1em] text-slate-700 mb-2">{'High'}</p>
            <p className="text-2xl text-slate-900 font-semibold">{summary.severityCounts?.high || 0}</p>
          </article>
          <article className="border-slate-200 pl-4 py-2">
            <p className="text-xs uppercase tracking-[0.1em] text-slate-700 mb-2">{'Critical'}</p>
            <p className="text-2xl text-slate-900 font-semibold">{summary.severityCounts?.critical || 0}</p>
          </article>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <article className="lg:pr-6 lg: border-slate-200">
            <h2 className="font-display text-xl text-slate-900 mb-4">{'Recent Anomalies'}</h2>
            {loadingEvents ? (
              <div className="text-center py-6">
                <LoaderCircle className="w-6 h-6 animate-spin text-emerald-600 mx-auto mb-2" />
                <p className="text-sm text-slate-700">{'Loading anomaly feed...'}</p>
              </div>
            ) : recentAnomalies.length === 0 ? (
              <p className="text-sm text-slate-700">{'No anomalies detected for the current filter scope.'}</p>
            ) : (
              <div className="space-y-3 max-h-[520px] overflow-auto pr-1">
                {recentAnomalies.map((event) => (
                  <article key={event._id} className="border-slate-200 pb-4 mb-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <p className="text-sm font-semibold text-slate-700">{event.message}</p>
                      <span className={`text-[11px] rounded-full border px-2.5 py-1 font-semibold ${severityPillClass(event.severity)}`}>
                        {event.severity}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mb-1">{'Event'}: {event.eventType}</p>
                    <p className="text-xs text-slate-500 inline-flex items-center gap-2">
                      <CalendarDays className="w-3.5 h-3.5" /> {formatDateTime(event.createdAt, { fallbackKey: 'security.na', fallbackText: 'N/A' })}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </article>

          <article className="lg:pl-6">
            <h2 className="font-display text-xl text-slate-900 mb-4">{'Filtered Event Stream'}</h2>
            {loadingEvents ? (
              <div className="text-center py-6">
                <LoaderCircle className="w-6 h-6 animate-spin text-emerald-600 mx-auto mb-2" />
                <p className="text-sm text-slate-700">{'Loading event stream...'}</p>
              </div>
            ) : events.length === 0 ? (
              <p className="text-sm text-slate-700">{'No events matched the selected filters.'}</p>
            ) : (
              <div className="space-y-2 max-h-[520px] overflow-auto pr-1">
                {events.map((event) => (
                  <div key={event._id} className="border-slate-200 pb-3 mb-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm text-slate-700 font-medium">{event.eventType}</p>
                      <span className={`text-[10px] rounded-full border px-2 py-0.5 font-semibold ${severityPillClass(event.severity)}`}>
                        {event.severity}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 mt-1">{event.message}</p>
                    <p className="text-[11px] text-slate-700 mt-1">
                      {formatDateTime(event.createdAt, { fallbackKey: 'security.na', fallbackText: 'N/A' })} | {event.actor?.email || 'System'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </article>
        </section>
      </div>
    </main>
  );
};

export default SecurityCenter;
