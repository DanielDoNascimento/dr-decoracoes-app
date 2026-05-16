import NetInfo from '@react-native-community/netinfo';

let _isOnline = true;

NetInfo.addEventListener(state => {
  _isOnline = !!(state.isConnected && state.isInternetReachable !== false);
});

export const getOnlineStatus = () => _isOnline;

export const isNetworkError = (err: any): boolean => {
  if (!err) return false;
  return (
    err.name === 'AbortError' ||
    err.message === 'offline' ||
    err.message?.toLowerCase().includes('failed to fetch') ||
    err.message?.toLowerCase().includes('network request failed')
  );
};
