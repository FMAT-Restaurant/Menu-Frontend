export type IconName = "search" | "close" | "add" | "image" | "arrow-left" | "arrow-right";

/** Decorative artwork: the surrounding control or visible text supplies its name. */
export function Icon({ name, className = "" }: Readonly<{ name: IconName; className?: string }>) {
  return (
    <svg
      className={`menu-icon ${className}`.trim()}
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {name === "search" && <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4 4" /></>}
      {name === "close" && <path d="m6 6 12 12M18 6 6 18" />}
      {name === "add" && <path d="M12 5v14M5 12h14" />}
      {name === "image" && <><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8" cy="8" r="1.5" /><path d="m3 17 5-5 4 4 4-6 5 7" /></>}
      {name === "arrow-left" && <><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></>}
      {name === "arrow-right" && <><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></>}
    </svg>
  );
}
