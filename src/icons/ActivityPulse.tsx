import type { SVGProps } from 'react'

/** Activity pulse line, for "Hide activity" (the HOT set has no activity icon). Drawn on a 24px grid. */
export function ActivityPulse({ size = 16, ...rest }: Omit<SVGProps<SVGSVGElement>, 'width' | 'height'> & { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" {...rest}>
      <path d="M22 12H18L15 21L9 3L6 12H2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
