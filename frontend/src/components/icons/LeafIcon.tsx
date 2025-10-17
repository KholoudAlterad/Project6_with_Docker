export function LeafIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M20 12C20 7.58172 16.4183 4 12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M12 4C12 4 15 8 15 12C15 14.2091 13.6569 16 12 16C10.3431 16 9 14.2091 9 12C9 8 12 4 12 4Z"
        fill="currentColor"
        opacity="0.5"
      />
      <path
        d="M12 8C12 8 14 10 14 12C14 13.1046 13.3284 14 12.5 14C11.6716 14 11 13.1046 11 12C11 10 12 8 12 8Z"
        fill="currentColor"
      />
    </svg>
  );
}
