import { useRouter } from 'expo-router';
import { useCallback } from 'react';

import { getApiBaseUrl } from '@/constants/api';
import { useModal } from '@/context/ModalContext';

// The auth screens all handled a failed connection with the same dead-end
// dialog: "Could not reach the server. Check your network." That message was
// actively misleading for the bug it most often signalled — in a standalone
// build the phone's network was usually fine and the app was simply pointed
// at an address that no longer existed (see constants/api.ts). Nothing on
// screen said which address had been tried, and nothing offered a way to
// change it.
//
// This shows the URL that actually failed and routes to Server Settings,
// turning an unrecoverable error into a two-tap fix.
export function useConnectionError() {
  const router = useRouter();
  const { showConfirm } = useModal();

  return useCallback(
    (title = 'Connection Error') => {
      showConfirm({
        title,
        message:
          `Could not reach the server at:\n\n${getApiBaseUrl()}\n\n` +
          'Check your internet connection. If the server has moved, update its address below.',
        confirmLabel: 'Server settings',
        cancelLabel: 'Dismiss',
        onConfirm: () => router.push('/server-settings' as any),
      });
    },
    [router, showConfirm]
  );
}
