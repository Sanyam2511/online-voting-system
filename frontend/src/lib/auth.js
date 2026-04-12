export const AUTH_CHANGED_EVENT = 'auth-changed';

export const setAuthSession = (userPayload) => {
  localStorage.setItem('token', userPayload.token);
  localStorage.setItem('user', JSON.stringify(userPayload));
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
};

export const clearAuthSession = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
};

export const getAuthToken = () => localStorage.getItem('token');

export const getStoredUser = () => {
  const userRaw = localStorage.getItem('user');

  if (!userRaw) {
    return null;
  }

  try {
    return JSON.parse(userRaw);
  } catch {
    return null;
  }
};

export const patchStoredUser = (partialUser) => {
  const currentUser = getStoredUser();

  if (!currentUser) {
    return;
  }

  const updatedUser = {
    ...currentUser,
    ...partialUser
  };

  localStorage.setItem('user', JSON.stringify(updatedUser));
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
};
