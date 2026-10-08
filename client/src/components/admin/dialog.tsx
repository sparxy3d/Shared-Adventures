import { useEffect, useRef, type ReactNode, type MouseEvent } from "react";
import { X } from "lucide-react";

export function AdminDialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const node = dialogRef.current;
    const focusables = () => node?.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"]') ?? [];
    focusables()[0]?.focus();
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") closeRef.current();
      if (event.key === "Tab") {
        const elements = Array.from(focusables());
        if (!elements.length) { event.preventDefault(); node?.focus(); return; }
        const first = elements[0];
        const last = elements[elements.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("keydown", onKeyDown); previous?.focus(); };
  }, []);

  const backdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onClose();
  };
  return <div className="ad-dialog-backdrop" onMouseDown={backdropClick}>
    <div className="ad-dialog" role="dialog" aria-modal="true" aria-label={title} ref={dialogRef} tabIndex={-1}>
      <div className="ad-dialog-head"><div><p className="ad-eyebrow">Free Spirit · Admin</p><h2>{title}</h2></div><button type="button" className="ad-dialog-close" aria-label="Close dialog" onClick={onClose}><X size={18} /></button></div>
      {children}
    </div>
  </div>;
}
