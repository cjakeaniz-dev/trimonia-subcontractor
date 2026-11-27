"use client";

import { createContext, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Button } from "./button";

export const EditDialogClose = createContext<(() => void) | null>(null);

export function EditDialog({ title, children, closeHref, trigger }: {
  title: string; children: ReactNode; closeHref?: string; trigger?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [open, setOpen] = useState(Boolean(closeHref));

  useEffect(() => {
    const element = dialog.current;
    if (open && element && !element.open) element.showModal();
  }, [open]);

  function close() {
    dialog.current?.close();
  }

  return <>
    {!closeHref && <Button className="secondary" type="button" aria-haspopup="dialog" onClick={() => setOpen(true)}>
      {trigger ?? title}
    </Button>}
    {open && <dialog ref={dialog} aria-labelledby={titleId} className="edit-dialog" onClose={() => {
      setOpen(false);
      if (closeHref) window.location.replace(closeHref);
    }}>
      <div className="edit-dialog-header">
        <h2 id={titleId}>{title}</h2>
        <Button className="secondary" type="button" onClick={close} autoFocus>Close</Button>
      </div>
      <div className="edit-dialog-content">
        <EditDialogClose.Provider value={() => {
          if (closeHref) window.location.replace(closeHref);
          else window.location.reload();
        }}>{children}</EditDialogClose.Provider>
      </div>
    </dialog>}
  </>;
}
