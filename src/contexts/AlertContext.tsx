import React, { createContext, useContext, useState, useCallback } from 'react';
import CustomDialog, { DialogButton } from '../components/CustomDialog';

export interface AlertOptions {
  title?: string;
  message?: string;
  buttons?: DialogButton[];
  dismissable?: boolean;
}

interface AlertContextType {
  showAlert: (options: AlertOptions) => void;
  hideAlert: () => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const [alertConfig, setAlertConfig] = useState<AlertOptions | null>(null);

  const showAlert = useCallback((options: AlertOptions) => {
    setAlertConfig(options);
  }, []);

  const hideAlert = useCallback(() => {
    setAlertConfig(null);
  }, []);

  return (
    <AlertContext.Provider value={{ showAlert, hideAlert }}>
      {children}
      {alertConfig && (
        <CustomDialog
          visible={!!alertConfig}
          onClose={hideAlert}
          title={alertConfig.title}
          message={alertConfig.message}
          buttons={alertConfig.buttons}
          dismissable={alertConfig.dismissable}
        />
      )}
    </AlertContext.Provider>
  );
}

export function useAlert() {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
}
