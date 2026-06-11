export default function CreatedByCredit() {
  return (
    <a
      href="https://davejoshua.vercel.app/"
      target="_blank"
      rel="noopener noreferrer"
      className="panel-glass pointer-events-auto fixed z-50 rounded-full px-3.5 py-1.5 text-xs text-[var(--text-secondary)] shadow-lg transition duration-200 hover:text-[var(--accent)]"
      style={{
        top: "max(1rem, env(safe-area-inset-top))",
        left: "max(1rem, env(safe-area-inset-left))",
      }}
    >
      Created by <span className="font-medium text-[var(--text-primary)]">dave</span>
    </a>
  );
}
