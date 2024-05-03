import Link from 'next/link'
import ThemeSwitcher from '@/components/ThemeSwitcher'

export default function NavBar(){
    return (
        <nav className='container flex items-center justify-between pr-4 pl-4'>
            <ul>
              <li>
                <Link href='/'>Home</Link>
              </li>
            </ul>
            <ThemeSwitcher />
          </nav>
    )
}