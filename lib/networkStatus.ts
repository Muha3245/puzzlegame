import { Alert } from 'react-native';

const NETWORK_ERROR_PATTERNS = [
  'network request failed',
  'failed to fetch',
  'load failed',
  'networkerror',
  'internet',
  'offline',
  'timeout',
];

export function isLikelyNetworkError(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : String((error as any)?.message ?? '');

  const normalized = message.toLowerCase();
  return NETWORK_ERROR_PATTERNS.some((pattern) => normalized.includes(pattern));
}

export function showNoInternetAlert(onClose?: () => void) {
  Alert.alert(
    'No Internet',
    'Online battles need an internet connection. Please connect and try again.',
    [{ text: 'OK', onPress: onClose }],
  );
}

export function showOnlineErrorAlert(
  error: unknown,
  fallbackTitle: string,
  fallbackMessage: string,
  onNoInternetClose?: () => void,
) {
  if (isLikelyNetworkError(error)) {
    showNoInternetAlert(onNoInternetClose);
    return;
  }

  Alert.alert(
    fallbackTitle,
    error instanceof Error ? error.message : fallbackMessage,
  );
}
