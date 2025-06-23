import * as React from "react"

// Breakpoints matching common device sizes
export const BREAKPOINTS = {
  sm: 640,  // Small mobile devices
  md: 768,  // Tablets and larger phones
  lg: 1024, // Small laptops
  xl: 1280, // Desktop screens
  xxl: 1536  // Large screens
}

type BreakpointKey = keyof typeof BREAKPOINTS

/**
 * Hook to check if the current viewport is below a specific breakpoint
 */
export function useBreakpoint(breakpoint: BreakpointKey) {
  const [isBelow, setIsBelow] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const breakpointValue = BREAKPOINTS[breakpoint]
    const mql = window.matchMedia(`(max-width: ${breakpointValue - 1}px)`)
    
    const onChange = () => {
      setIsBelow(mql.matches)
    }
    
    mql.addEventListener("change", onChange)
    setIsBelow(mql.matches)
    
    return () => mql.removeEventListener("change", onChange)
  }, [breakpoint])

  return isBelow
}

/**
 * Hook to determine if the device is mobile (less than md breakpoint)
 */
export function useIsMobile() {
  return useBreakpoint('md')
}

/**
 * Hook to determine if the device is a tablet (between md and lg breakpoints)
 */
export function useIsTablet() {
  const belowLg = useBreakpoint('lg')
  const belowMd = useBreakpoint('md')
  
  return belowLg && !belowMd
}

/**
 * Hook to determine if the device is a small mobile (less than sm breakpoint)
 */
export function useIsSmallMobile() {
  return useBreakpoint('sm')
}

/**
 * Hook to determine if the device is a desktop (lg or larger)
 */
export function useIsDesktop() {
  const belowLg = useBreakpoint('lg')
  return !belowLg
}
