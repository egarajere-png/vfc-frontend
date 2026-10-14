export function Logo({ className = 'h-9 w-9' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <circle cx="24" cy="24" r="23" fill="#B1890C" />
      <path d="M21 9h6v10h10v6H27v14h-6V25H11v-6h10z" fill="#fff" />
      <path d="M8 38c8-2 14-8 16-16-9 1-15 7-16 16z" fill="#779324" />
    </svg>
  );
}
