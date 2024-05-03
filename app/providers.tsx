'use client'

import { NextUIProvider } from '@nextui-org/react'
import { ThemeProvider as NextThemesProvider } from 'next-themes'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
      <NextThemesProvider
        attribute='class'
        defaultTheme='dark'
        themes={['light', 'dark']}
      >
        {children}
      </NextThemesProvider>
  )
}
