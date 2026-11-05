export function Logo({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <path d="M16 4.5 26.5 10.3v11.4L16 27.5 5.5 21.7V10.3z" fill="none" stroke="var(--cyan)" strokeWidth="1.5" />
      <path d="M5.5 10.3 16 16l10.5-5.7M16 16v11.5" fill="none" stroke="var(--cyan)" strokeWidth="1.1" opacity=".5" />
      <circle cx="16" cy="16" r="2.2" fill="var(--white)" />
    </svg>
  )
}
