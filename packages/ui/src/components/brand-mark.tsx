import type React from 'react'
import { cn } from '../lib/utils.ts'

/** Cymbient eight-petal brand mark, served locally, including in the web build. */
export function BrandMark({
  className,
  ...props
}: React.ComponentProps<'img'>): React.ReactElement {
  return (
    <img
      src="/brand/cymbient-mark.svg"
      alt=""
      aria-hidden="true"
      className={cn('size-5 shrink-0 object-contain', className)}
      {...props}
    />
  )
}
