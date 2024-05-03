import './page.css'
import Providers from '@/app/providers'


export default function PageLayout({
    children
  }: {
    children: React.ReactNode
  }) {
    return (
            <main>
              {children}
            </main>
    )
  }
