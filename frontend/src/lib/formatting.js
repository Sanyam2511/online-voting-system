export const formatElectionStatus = (status, t) => {
  if (!status) {
    return t('election.status.unknown', 'Unknown');
  }

  const map = {
    draft: t('election.status.draft', 'Draft'),
    registration: t('election.status.registration', 'Registration'),
    live: t('election.status.live', 'Voting Live'),
    counting: t('election.status.counting', 'Counting'),
    audited: t('election.status.audited', 'Audited'),
    published: t('election.status.published', 'Published'),
    archived: t('election.status.archived', 'Archived')
  };

  return map[status] || status;
};

export const formatDateTime = (value, t, options = {}) => {
  const {
    fallbackKey = 'common.na',
    fallbackText = 'N/A'
  } = options;

  if (!value) {
    return t(fallbackKey, fallbackText);
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return t(fallbackKey, fallbackText);
  }

  return date.toLocaleString();
};
