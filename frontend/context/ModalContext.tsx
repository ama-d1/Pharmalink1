import { createContext, useCallback, useContext, useMemo, useState, ReactNode } from 'react';
import { AppModal, ModalVariant } from '@/components/ui/AppModal';

// App-wide replacement for Alert.alert.
//
// The point of doing this as a context rather than a local <AppModal> in each
// screen: there are 100+ Alert.alert call sites across this app. Making every
// one of them declare its own `visible` state, message state, and JSX would be
// a huge amount of duplicated boilerplate and would guarantee inconsistency.
// With this, a screen calls showError('Title', 'message') exactly the way it
// used to call Alert.alert, and a single themed modal (rendered once, at the
// root) handles presentation.
//
// showConfirm() takes an onConfirm callback so destructive actions (delete
// medication, cancel order, log out) keep working the same way they did with
// Alert.alert's two-button form.

type ModalState = {
  visible: boolean;
  variant: ModalVariant;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  showCancel: boolean;
};

const INITIAL: ModalState = {
  visible: false,
  variant: 'info',
  title: '',
  message: undefined,
  showCancel: false,
};

/**
 * Optional extras for the single-button dialogs. Covers the Alert.alert form
 * that passed a custom button with an onPress action, e.g.
 *   [{ text: 'Track Delivery', onPress: () => router.replace(...) }]
 * without forcing those call sites into showConfirm's two-button layout.
 */
type MessageOptions = {
  confirmLabel?: string;
  onConfirm?: () => void;
};

type ModalContextValue = {
  showError: (title: string, message?: string, opts?: MessageOptions) => void;
  showSuccess: (title: string, message?: string, opts?: MessageOptions) => void;
  showWarning: (title: string, message?: string, opts?: MessageOptions) => void;
  showInfo: (title: string, message?: string, opts?: MessageOptions) => void;
  showConfirm: (opts: {
    title: string;
    message?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    destructive?: boolean;
    onConfirm: () => void;
  }) => void;
  hideModal: () => void;
};

const ModalContext = createContext<ModalContextValue | null>(null);

export function ModalProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ModalState>(INITIAL);

  const hideModal = useCallback(() => {
    setState((s) => ({ ...s, visible: false }));
  }, []);

  const show = useCallback(
    (variant: ModalVariant, title: string, message?: string, opts?: MessageOptions) => {
      setState({
        visible: true,
        variant,
        title,
        message,
        confirmLabel: opts?.confirmLabel,
        onConfirm: opts?.onConfirm,
        showCancel: false,
      });
    },
    []
  );

  const value = useMemo<ModalContextValue>(
    () => ({
      showError: (title, message, opts) => show('error', title, message, opts),
      showSuccess: (title, message, opts) => show('success', title, message, opts),
      showWarning: (title, message, opts) => show('warning', title, message, opts),
      showInfo: (title, message, opts) => show('info', title, message, opts),
      showConfirm: ({ title, message, confirmLabel, cancelLabel, destructive, onConfirm }) =>
        setState({
          visible: true,
          variant: destructive ? 'error' : 'confirm',
          title,
          message,
          confirmLabel,
          cancelLabel,
          onConfirm,
          showCancel: true,
        }),
      hideModal,
    }),
    [show, hideModal]
  );

  return (
    <ModalContext.Provider value={value}>
      {children}
      <AppModal
        visible={state.visible}
        variant={state.variant}
        title={state.title}
        message={state.message}
        confirmLabel={state.confirmLabel}
        cancelLabel={state.cancelLabel}
        onConfirm={() => {
          // Close first, then run the action — otherwise a callback that
          // navigates away can unmount this provider's subtree while the
          // modal is still marked visible, leaving it stuck open on return.
          hideModal();
          state.onConfirm?.();
        }}
        onCancel={state.showCancel ? hideModal : undefined}
      />
    </ModalContext.Provider>
  );
}

export function useModal() {
  const ctx = useContext(ModalContext);
  if (!ctx) {
    throw new Error('useModal must be used inside <ModalProvider> (see app/_layout.tsx)');
  }
  return ctx;
}
