import { forwardRef, type ComponentPropsWithoutRef, type CSSProperties } from 'react'

import useResponsiveLayout from './useResponsiveLayout'

export interface ResponsiveGridProps extends ComponentPropsWithoutRef<'div'> {
  minSidebarWidth?: string
  splitRatio?: [number, number]
  gap?: string
}

const ResponsiveGrid = forwardRef<HTMLDivElement, ResponsiveGridProps>(
  ({ minSidebarWidth = '280px', splitRatio = [8, 16], gap = 'var(--space-lg)', style, children, ...rest }, ref) => {
    const layout = useResponsiveLayout()
    const templateColumns =
      layout.columns === 2
        ? `minmax(${minSidebarWidth}, ${splitRatio[0]}fr) minmax(0, ${splitRatio[1]}fr)`
        : '1fr'

    const mergedStyle: CSSProperties = {
      display: 'grid',
      alignItems: 'start',
      gap,
      gridTemplateColumns: templateColumns,
      ...style,
    }

    return (
      <div
        ref={ref}
        {...rest}
        data-breakpoint={layout.breakpoint}
        data-columns={layout.columns}
        data-layout={layout.isStackedPanels ? 'stacked' : 'split'}
        style={mergedStyle}
      >
        {children}
      </div>
    )
  },
)

ResponsiveGrid.displayName = 'ResponsiveGrid'

export default ResponsiveGrid
