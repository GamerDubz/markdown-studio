type QuillMarkProps = {
  className?: string
  /** Fixed pixel size for width/height. Omit to size via className/CSS instead. */
  size?: number
}

/**
 * Original mark for Markdown Studio: a quill nib pierced by a slash,
 * a quiet nod to Markdown's own "/" and "_" syntax marks. Two flat
 * shapes, no gradients — reads clean from 16px favicons up to 512px.
 */
export function QuillMark({ className, size }: QuillMarkProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="Markdown Studio"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M16 3c4.6 5 4.6 11.6 2.9 17.3C17.6 24.6 16.7 27.6 16 30c-.7-2.4-1.6-5.4-2.9-9.7C11.4 14.6 11.4 8 16 3Z"
        fill="currentColor"
        fillRule="evenodd"
      />
      <path
        d="M16 8.4c.62 0 1.12.5 1.12 1.12v13.2a1.12 1.12 0 1 1-2.24 0V9.52c0-.62.5-1.12 1.12-1.12Z"
        fill="var(--color-mark-slit, #f7f2e7)"
      />
      <rect
        x="3"
        y="19.4"
        width="26"
        height="3.1"
        rx="1.55"
        transform="rotate(-24 16 21)"
        fill="var(--color-mark-accent, currentColor)"
      />
    </svg>
  )
}
