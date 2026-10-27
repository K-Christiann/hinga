import {
  useEffect,
  useRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import { useApp } from "../context";
import { ArrowRight, LockKeyhole, X } from "lucide-react";

export function Button({
  tone = "primary",
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: "primary" | "secondary" | "ghost" | "danger";
}) {
  return (
    <button className={`button button-${tone} ${className}`} {...props}>
      {children}
    </button>
  );
}
export function PrivateBadge({
  children = "Only in your space",
}: {
  children?: ReactNode;
}) {
  return (
    <span className="private-badge">
      <LockKeyhole size={12} aria-hidden="true" />
      {children}
    </span>
  );
}
export function Modal({
  open,
  onClose,
  title,
  children,
  className = "",
  eyebrow,
  closeLabel = "Close dialog",
}: {
  open: boolean;
  onClose(): void;
  title: string;
  children: ReactNode;
  className?: string;
  eyebrow?: string;
  closeLabel?: string;
}) {
  const { error, toast, clearToast } = useApp();
  useEffect(() => {
    if (open) clearToast();
  }, [open]);
  const ref = useRef<HTMLDialogElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (open && !node.open) {
      node.showModal();
      titleRef.current?.focus();
    }
    if (!open && node.open) node.close();
    return () => {
      if (node.open) node.close();
    };
  }, [open]);
  return (
    <dialog
      ref={ref}
      className={`modal ${className}`}
      aria-labelledby={title.replace(/\W/g, "-")}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          const bounds = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < bounds.left ||
            event.clientX > bounds.right ||
            event.clientY < bounds.top ||
            event.clientY > bounds.bottom
          )
            onClose();
        }
      }}
    >
      <div className="modal-inner">
        <div className="modal-heading">
          <div>
            {eyebrow && <p className="eyebrow">{eyebrow}</p>}
            <h2 id={title.replace(/\W/g, "-")} ref={titleRef} tabIndex={-1}>
              {title}
            </h2>
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label={closeLabel}
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
        {children}
        {open && error && <ErrorLine>{error}</ErrorLine>}
        {open && !error && toast && (
          <p role="status" className="inline-notice">
            {toast}
          </p>
        )}
      </div>
    </dialog>
  );
}
export function FlowerMark({
  size = 35,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <g fill="currentColor">
        <ellipse cx="32" cy="19" rx="7.5" ry="13" />
        <ellipse cx="32" cy="45" rx="7.5" ry="13" />
        <ellipse cx="19" cy="32" rx="13" ry="7.5" />
        <ellipse cx="45" cy="32" rx="13" ry="7.5" />
      </g>
      <circle cx="32" cy="32" r="7" fill="var(--peach, #e7bd9d)" />
    </svg>
  );
}
export function Logo() {
  return (
    <span className="logo">
      <FlowerMark />
      <span>
        hinga<span className="logo-dot">.</span>
      </span>
    </span>
  );
}
export function PageIntro({
  eyebrow,
  title,
  children,
  action,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="page-intro">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="page-description">{children}</p>
      </div>
      {action && <div className="intro-action">{action}</div>}
    </div>
  );
}
export function EmptyState({
  icon,
  title,
  children,
  action,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{children}</p>
      {action}
    </div>
  );
}
export function TextLink({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick(): void;
}) {
  return (
    <button className="text-link" onClick={onClick}>
      {children}
      <ArrowRight size={15} />
    </button>
  );
}
export function ErrorLine({ children }: { children: ReactNode }) {
  return children ? (
    <p role="alert" className="error-line">
      {children}
    </p>
  ) : null;
}
