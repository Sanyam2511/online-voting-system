export const formatElectionStatus = (status) => {
  if (!status) {
    return 'Unknown';
  }

  const map = {
    draft: 'Draft',
    registration: 'Registration',
    live: 'Voting Live',
    counting: 'Counting',
    audited: 'Audited',
    published: 'Published',
    archived: 'Archived'
  };

  return map[status] || status;
};

export const formatDateTime = (value, options = {}) => {
  const {
    fallbackKey = 'common.na',
    fallbackText = 'N/A'
  } = options;

  if (!value) {
    return fallbackText;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return fallbackText;
  }

  return date.toLocaleString();
};
