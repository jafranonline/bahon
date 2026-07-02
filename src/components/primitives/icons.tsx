import type { ReactNode } from 'react'

/* Shared stroke icon set for the three log types, matching the bottom nav's
 * line style — replaces platform-dependent emoji so icons render identically
 * on every OS. */

interface IconProps {
  size?: number
}

const icon = (path: ReactNode, size: number) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true"
       stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    {path}
  </svg>
)

export const FuelTypeIcon = ({ size = 22 }: IconProps) => icon(<>
  <path d="M3 22h12M4 9h10M14 22V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v18" />
  <path d="M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 4 0V9.83a2 2 0 0 0-.59-1.42L18 5" />
</>, size)

export const ServiceTypeIcon = ({ size = 22 }: IconProps) => icon(
  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />,
  size
)

export const ExpenseTypeIcon = ({ size = 22 }: IconProps) => icon(<>
  <rect x="2" y="6" width="20" height="12" rx="2" />
  <circle cx="12" cy="12" r="2.25" />
  <path d="M6 12h.01M18 12h.01" />
</>, size)
