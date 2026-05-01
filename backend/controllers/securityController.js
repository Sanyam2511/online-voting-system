import mongoose from 'mongoose';
import SecurityEvent, { SECURITY_SEVERITIES } from '../models/SecurityEvent.js';

const EVENT_LIMIT_DEFAULT = 50;
const EVENT_LIMIT_MAX = 200;

const normalizeSecurityEvent = (event) => {
  const actorRef = event.actor;
  const electionRef = event.election;

  return {
    _id: event.id,
    eventType: event.eventType,
    category: event.category,
    severity: event.severity,
    isAnomaly: Boolean(event.isAnomaly),
    message: event.message,
    actor: actorRef
      ? {
          _id: actorRef.id,
          name: actorRef.name,
          email: actorRef.email,
          role: actorRef.role
        }
      : {
          _id: null,
          name: '',
          email: event.actorEmail || '',
          role: event.actorRole || ''
        },
    election: electionRef
      ? {
          _id: electionRef.id,
          name: electionRef.name,
          status: electionRef.status
        }
      : {
          _id: event.election ? String(event.election) : null,
          name: event.electionName || ''
        },
    sourceIp: event.sourceIp || '',
    userAgent: event.userAgent || '',
    metadata: event.metadata || {},
    createdAt: event.createdAt,
    updatedAt: event.updatedAt
  };
};

const buildEventFilters = (query = {}) => {
  const filter = {};

  const electionId = String(query.electionId || '').trim();
  if (electionId) {
    if (!mongoose.Types.ObjectId.isValid(electionId)) {
      return { error: { status: 400, message: 'Invalid electionId filter.' } };
    }

    filter.election = electionId;
  }

  const eventType = String(query.eventType || '').trim();
  if (eventType) {
    filter.eventType = eventType;
  }

  const category = String(query.category || '').trim().toLowerCase();
  if (category) {
    const allowedCategories = ['verification', 'voting', 'access', 'admin', 'system'];

    if (!allowedCategories.includes(category)) {
      return { error: { status: 400, message: 'Invalid category filter.' } };
    }

    filter.category = category;
  }

  const severity = String(query.severity || '').trim().toLowerCase();
  if (severity) {
    if (!SECURITY_SEVERITIES.includes(severity)) {
      return { error: { status: 400, message: 'Invalid severity filter.' } };
    }

    filter.severity = severity;
  }

  const anomalyOnlyRaw = String(query.anomalyOnly || '').trim().toLowerCase();
  if (anomalyOnlyRaw === 'true') {
    filter.isAnomaly = true;
  } else if (anomalyOnlyRaw === 'false') {
    filter.isAnomaly = false;
  }

  return { filter };
};

const parseLimit = (rawLimit) => {
  if (!rawLimit) {
    return EVENT_LIMIT_DEFAULT;
  }

  const numeric = Number(rawLimit);
  if (Number.isNaN(numeric)) {
    return EVENT_LIMIT_DEFAULT;
  }

  return Math.max(1, Math.min(EVENT_LIMIT_MAX, Math.floor(numeric)));
};

// @desc Get security events list (admin)
export const getSecurityEvents = async (req, res) => {
  try {
    const filtersResult = buildEventFilters(req.query || {});

    if (filtersResult.error) {
      return res.status(filtersResult.error.status).json({ message: filtersResult.error.message });
    }

    const limit = parseLimit(req.query.limit);

    const events = await SecurityEvent.find(filtersResult.filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('actor', 'name email role')
      .populate('election', 'name status');

    return res.status(200).json({
      events: events.map((event) => normalizeSecurityEvent(event)),
      totalReturned: events.length,
      limit
    });
  } catch {
    return res.status(500).json({ message: 'Server error while loading security events.' });
  }
};

// @desc Get security event summary and anomaly overview (admin)
export const getSecurityOverview = async (req, res) => {
  try {
    const filtersResult = buildEventFilters(req.query || {});

    if (filtersResult.error) {
      return res.status(filtersResult.error.status).json({ message: filtersResult.error.message });
    }

    const baseFilter = { ...filtersResult.filter };
    const anomalyFilter = {
      ...baseFilter,
      isAnomaly: true
    };

    const sinceHoursRaw = Number(req.query.sinceHours || 24);
    const sinceHours = Number.isNaN(sinceHoursRaw) ? 24 : Math.max(1, Math.min(168, Math.floor(sinceHoursRaw)));
    const sinceDate = new Date(Date.now() - (sinceHours * 60 * 60 * 1000));

    const [
      totalEvents,
      totalAnomalies,
      anomaliesInWindow,
      severityBreakdown,
      eventTypeBreakdown,
      recentAnomalies
    ] = await Promise.all([
      SecurityEvent.countDocuments(baseFilter),
      SecurityEvent.countDocuments(anomalyFilter),
      SecurityEvent.countDocuments({ ...anomalyFilter, createdAt: { $gte: sinceDate } }),
      SecurityEvent.aggregate([
        { $match: anomalyFilter },
        {
          $group: {
            _id: '$severity',
            count: { $sum: 1 }
          }
        }
      ]),
      SecurityEvent.aggregate([
        { $match: anomalyFilter },
        {
          $group: {
            _id: '$eventType',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1, _id: 1 } },
        { $limit: 12 }
      ]),
      SecurityEvent.find(anomalyFilter)
        .sort({ createdAt: -1 })
        .limit(12)
        .populate('actor', 'name email role')
        .populate('election', 'name status')
    ]);

    const normalizedSeverityCounts = SECURITY_SEVERITIES.reduce((acc, severity) => ({
      ...acc,
      [severity]: 0
    }), {});

    severityBreakdown.forEach((entry) => {
      normalizedSeverityCounts[entry._id] = entry.count;
    });

    const eventTypeCounts = eventTypeBreakdown.map((entry) => ({
      eventType: entry._id,
      count: entry.count
    }));

    return res.status(200).json({
      summary: {
        totalEvents,
        totalAnomalies,
        anomaliesInWindow,
        sinceHours,
        severityCounts: normalizedSeverityCounts,
        eventTypeCounts
      },
      recentAnomalies: recentAnomalies.map((event) => normalizeSecurityEvent(event))
    });
  } catch {
    return res.status(500).json({ message: 'Server error while loading security overview.' });
  }
};
