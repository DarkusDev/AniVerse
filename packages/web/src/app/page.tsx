'use client';

import Link from 'next/link';
import AniVerseLogo from '@/components/AniVerseLogo';
import { useAuth } from '@/contexts/AuthContext';

const FEATURES = [
  {
    icon: '✦',
    title: 'Descubre',
    description: 'Explora miles de títulos de anime y manga con recomendaciones personalizadas.',
  },
  {
    icon: '◈',
    title: 'Conecta',
    description: 'Únete a una comunidad apasionada y comparte tus opiniones con el mundo.',
  },
  {
    icon: '◉',
    title: 'Sigue',
    description: 'Lleva el control de tu lista de pendientes, en progreso y completados.',
  },
] as const;

export default function HomePage(): React.JSX.Element {
  const { user } = useAuth();

  return (
    <main className="relative min-h-screen overflow-hidden bg-surface flex flex-col">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full bg-violet-600/10 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-pink-600/10 blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[300px] w-[300px] rounded-full bg-orange-500/5 blur-[80px]" />
      </div>

      {/* Nav */}
      <header className="relative z-10 flex items-center justify-between px-6 py-5 md:px-12">
        <div className="flex items-center gap-2.5">
          <AniVerseLogo size={32} />
          <span className="font-bold text-lg tracking-tight text-white">AniVerse</span>
        </div>
        <nav className="flex items-center gap-3">
          {user ? (
            <Link
              href="/profile"
              className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-brand-light glow-brand"
            >
              Mi perfil
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-400 transition-colors hover:text-white"
              >
                Iniciar sesión
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-brand-light glow-brand"
              >
                Registrarse
              </Link>
            </>
          )}
        </nav>
      </header>

      {/* Hero */}
      <section className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-20 text-center">
        {/* Logo */}
        <div className="animate-float mb-8">
          <AniVerseLogo size={120} />
        </div>

        {/* Badge */}
        <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-brand-light">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-light animate-pulse-slow" />
          Bienvenido al universo
        </span>

        {/* Heading */}
        <h1 className="mb-5 text-5xl font-extrabold leading-none tracking-tight md:text-7xl lg:text-8xl">
          <span className="text-gradient">Tu universo</span>
          <br />
          <span className="text-white">de anime</span>
        </h1>

        {/* Subtitle */}
        <p className="mb-10 max-w-xl text-base leading-relaxed text-gray-400 md:text-lg">
          Descubre, sigue y comparte todo lo que amas del anime y manga. Una comunidad hecha por
          y para fans.
        </p>

        {/* CTAs */}
        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <a
            href="#"
            className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-violet-600 via-pink-600 to-orange-500 px-8 py-3.5 text-sm font-bold text-white shadow-lg transition-all hover:scale-[1.03] hover:shadow-brand/40 hover:shadow-xl"
          >
            Explorar ahora
            <svg
              className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
          <a
            href="#"
            className="inline-flex items-center gap-2 rounded-xl border border-surface-border bg-surface-elevated px-8 py-3.5 text-sm font-semibold text-gray-300 transition-all hover:border-brand/40 hover:text-white"
          >
            Ver demo
          </a>
        </div>

        {/* Stats */}
        <div className="mt-16 flex flex-wrap items-center justify-center gap-8 text-center">
          {[
            { value: '10K+', label: 'Títulos' },
            { value: '50K+', label: 'Usuarios' },
            { value: '1M+', label: 'Reseñas' },
          ].map(({ value, label }) => (
            <div key={label}>
              <p className="text-2xl font-extrabold text-gradient">{value}</p>
              <p className="text-xs font-medium uppercase tracking-widest text-gray-500">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 px-6 pb-24 md:px-12">
        <div className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-3">
          {FEATURES.map(({ icon, title, description }) => (
            <div
              key={title}
              className="group rounded-2xl border border-surface-border bg-surface-elevated p-6 transition-all hover:border-brand/30 hover:bg-brand/5"
            >
              <span className="mb-4 block text-2xl text-brand-light">{icon}</span>
              <h3 className="mb-2 font-bold text-white">{title}</h3>
              <p className="text-sm leading-relaxed text-gray-500">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-surface-border px-6 py-5 text-center text-xs text-gray-600 md:px-12">
        © {new Date().getFullYear()} AniVerse. Todos los derechos reservados.
      </footer>
    </main>
  );
}
