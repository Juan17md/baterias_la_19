"use client";

import { Toaster as SonnerToaster } from "sonner";

/** Toasts de la aplicación (esquina inferior derecha), tematizados con los tokens del Design System. */
function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      style={
        {
          "--normal-bg": "var(--elevated)",
          "--normal-text": "var(--foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "font-sans",
          description: "text-muted-foreground",
          actionButton:
            "rounded-md bg-primary px-2 py-1 text-primary-foreground",
          cancelButton: "rounded-md bg-muted px-2 py-1 text-muted-foreground",
        },
      }}
    />
  );
}

export { Toaster };
