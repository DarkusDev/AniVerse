'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import AniVerseLogo from '@/components/AniVerseLogo';
import { useAuth } from '@/contexts/AuthContext';

export default function Navbar(): React.JSX.Element {
  const { user } = useAuth();
  const pathname = usePathname();

  const navLink = (href: string, label: string) => {
    const active = pathname.startsWith(href);
    return (
      <Link
        href={href}
        className={`text-sm font-medium transition-colors ${
          active ? 'text-white' : 'text-gray-400 hover:text-white'
        }`}
      >
        {label}
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-50 border-b border-surface-border bg-surface/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <AniVerseLogo size={28} />
          <span className="font-bold text-base tracking-tight text-white">AniVerse</span>
        </Link>

        {/* Nav links */}
        <nav className="hidden items-center gap-6 md:flex">
          {navLink('/explore', 'Explorar')}
          {user && navLink('/my-list', 'Mi Lista')}
          {user && navLink('/import', 'Importar')}
        </nav>

        {/* Auth */}
        <div className="flex items-center gap-3">
          {user ? (
            <Link
              href="/profile"
              className="flex items-center gap-2 rounded-lg bg-surface-elevated px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand/20 border border-surface-border hover:border-brand/30"
            >
              <span className="h-6 w-6 rounded-full bg-brand/40 flex items-center justify-center text-xs font-bold text-brand-light">
                {user.username[0]?.toUpperCase()}
              </span>
              <span className="hidden sm:inline">{user.username}</span>
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-medium text-gray-400 transition-colors hover:text-white"
              >
                Iniciar sesión
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-brand px-4 py-1.5 text-sm font-semibold text-white transition-all hover:bg-brand-light"
              >
                Registrarse
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
