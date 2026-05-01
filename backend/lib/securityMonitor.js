import SecurityEvent from '../models/SecurityEvent.js';

const ADMIN_ACTION_SPIKE_WINDOW_MINUTES = 15;
const ADMIN_ACTION_SPIKE_THRESHOLD = 6;
const ADMIN_ACTION_SPIKE_COOLDOWN_MINUTES = 5;

const normalizeIpAddress = (ipAddressRaw) => {
  const value = String(ipAddressRaw || '').trim();
  if (!value) {
    return '';
  }

  if (value.includes(',')) {
    return value.split(',')[0].trim();
  }

  return value;
};

const truncateUserAgent = (value) => String(value || '').trim().slice(0, 280);

export const getRequestSecurityContext = (req) => {
  const forwardedIp = req.headers['x-forwarded-for'];
  const realIp = req.headers['x-real-ip'];

  return {
    ipAddress: normalizeIpAddress(forwardedIp || realIp || req.ip || req.socket?.remoteAddress || ''),
    userAgent: truncateUserAgent(req.headers['user-agent'])
  };
};

const buildEventPayload = ({
  eventType,
  category,
  severity = 'info',
  isAnomaly = false,
  message,
  actorId = null,
  actorRole = '',
  actorEmail = '',
  electionId = null,
  electionName = '',
  sourceIp = '',
  userAgent = '',
  metadata = {}
}) => ({
  eventType,
  category,
  severity,
  isAnomaly,
  message,
  actor: actorId,
  actorRole,
  actorEmail,
  election: electionId,
  electionName,
  sourceIp,
  userAgent,
  metadata
});

export const createSecurityEvent = async (payload) => {
  return SecurityEvent.create(buildEventPayload(payload));
};

export const observeAccessFingerprint = async ({
  actor,
  actorRole,
  actorEmail,
  election,
  electionName,
  eventType,
  message,
  requestContext,
  metadata = {}
}) => {
  const previousAccessEvent = await SecurityEvent.findOne({
    actor: actor.id,
    category: 'access',
    isAnomaly: false
  }).sort({ createdAt: -1 });

  const basePayload = {
    actorId: actor.id,
    actorRole: actorRole || actor.role || '',
    actorEmail: actorEmail || actor.email || '',
    electionId: election?.id || election?._id || null,
    electionName: electionName || election?.name || '',
    sourceIp: requestContext.ipAddress,
    userAgent: requestContext.userAgent,
    metadata
  };

  await createSecurityEvent({
    ...basePayload,
    eventType,
    category: 'access',
    severity: 'info',
    isAnomaly: false,
    message
  });

  if (!previousAccessEvent) {
    return;
  }

  if (
    previousAccessEvent.sourceIp &&
    requestContext.ipAddress &&
    previousAccessEvent.sourceIp !== requestContext.ipAddress
  ) {
    await createSecurityEvent({
      ...basePayload,
      eventType: 'access_ip_change',
      category: 'access',
      severity: 'medium',
      isAnomaly: true,
      message: 'User access IP changed between security-sensitive actions.',
      metadata: {
        previousIp: previousAccessEvent.sourceIp,
        nextIp: requestContext.ipAddress,
        referenceEventType: eventType
      }
    });
  }

  if (
    previousAccessEvent.userAgent &&
    requestContext.userAgent &&
    previousAccessEvent.userAgent !== requestContext.userAgent
  ) {
    await createSecurityEvent({
      ...basePayload,
      eventType: 'access_device_change',
      category: 'access',
      severity: 'medium',
      isAnomaly: true,
      message: 'User device fingerprint changed between security-sensitive actions.',
      metadata: {
        previousUserAgent: previousAccessEvent.userAgent,
        nextUserAgent: requestContext.userAgent,
        referenceEventType: eventType
      }
    });
  }
};

export const recordAdminAction = async ({
  actor,
  eventType,
  message,
  requestContext,
  election,
  electionName,
  metadata = {}
}) => {
  const actorId = actor?.id || actor?._id;

  await createSecurityEvent({
    eventType,
    category: 'admin',
    severity: 'info',
    isAnomaly: false,
    message,
    actorId,
    actorRole: actor?.role || '',
    actorEmail: actor?.email || '',
    electionId: election?.id || election?._id || null,
    electionName: electionName || election?.name || '',
    sourceIp: requestContext.ipAddress,
    userAgent: requestContext.userAgent,
    metadata
  });

  const now = Date.now();
  const windowStart = new Date(now - (ADMIN_ACTION_SPIKE_WINDOW_MINUTES * 60 * 1000));

  const actionCount = await SecurityEvent.countDocuments({
    actor: actorId,
    category: 'admin',
    isAnomaly: false,
    createdAt: { $gte: windowStart }
  });

  if (actionCount < ADMIN_ACTION_SPIKE_THRESHOLD) {
    return;
  }

  const cooldownStart = new Date(now - (ADMIN_ACTION_SPIKE_COOLDOWN_MINUTES * 60 * 1000));

  const recentSpike = await SecurityEvent.findOne({
    actor: actorId,
    eventType: 'admin_action_spike',
    isAnomaly: true,
    createdAt: { $gte: cooldownStart }
  }).select('_id');

  if (recentSpike) {
    return;
  }

  await createSecurityEvent({
    eventType: 'admin_action_spike',
    category: 'admin',
    severity: 'high',
    isAnomaly: true,
    message: 'High frequency admin activity detected in a short time window.',
    actorId,
    actorRole: actor?.role || '',
    actorEmail: actor?.email || '',
    electionId: election?.id || election?._id || null,
    electionName: electionName || election?.name || '',
    sourceIp: requestContext.ipAddress,
    userAgent: requestContext.userAgent,
    metadata: {
      actionCount,
      windowMinutes: ADMIN_ACTION_SPIKE_WINDOW_MINUTES,
      triggeringEventType: eventType
    }
  });
};
