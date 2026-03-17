'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ApiError } from '@/lib/api-client';
import { validate, hasErrors } from '@/lib/validation';
import { FormField, inputCls } from '@/components/ui/FormField';
import AniVerseLogo from '@/components/AniVerseLogo';

interface Fields {
  email: string;
  username: string;
  password: string;
}

interface Errors {
  email: string;
  username: string;
  password: string;
}

export default function RegisterPage(): React.JSX.Element {
  const { register } = useAuth();
  const router = useRouter();

  const [fields, setFields] = useState<Fields>({ email: '', username: '', password: '' });
  const [errors, setErrors] = useState<Errors>({ email: '', username: '', password: '' });
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  function set(key: keyof Fields) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setFields((prev) => ({ ...prev, [key]: e.target.value }));
      setErrors((prev) => ({ ...prev, [key]: '' }));
      setServerError('');
    };
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();

    const next: Errors = {
      email: validate.email(fields.email),
      username: validate.username(fields.username),
      password: validate.password(fields.password),
    };
    setErrors(next);
    if (hasErrors(next)) return;

    setLoading(true);
    try {
      await register(fields.email, fields.username, fields.password);
      router.push('/');
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : 'Error inesperado. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-4 py-12">
      {/* Fondo decorativo */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-violet-600/10 blur-[100px]" />
        <div className="absolute -bottom-40 -left-40 h-[400px] w-[400px] rounded-full bg-orange-500/8 blur-[100px]" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <Link href="/">
            <AniVerseLogo size={52} />
          </Link>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white">Crea tu cuenta</h1>
            <p className="mt-1 text-sm text-gray-500">Únete a la comunidad AniVerse</p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="space-y-5 rounded-2xl border border-surface-border bg-surface-elevated p-8"
        >
          {/* Error del servidor */}
          {serverError && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {serverError}
            </div>
          )}

          <FormField label="Email" error={errors.email}>
            <input
              type="email"
              value={fields.email}
              onChange={set('email')}
              placeholder="tu@email.com"
              autoComplete="email"
              className={inputCls(!!errors.email)}
            />
          </FormField>

          <FormField
            label="Username"
            error={errors.username}
            hint="3-30 caracteres. Solo letras, números y _"
          >
            <input
              type="text"
              value={fields.username}
              onChange={set('username')}
              placeholder="otaku_master"
              autoComplete="username"
              className={inputCls(!!errors.username)}
            />
          </FormField>

          <FormField label="Contraseña" error={errors.password} hint="Mínimo 8 caracteres">
            <input
              type="password"
              value={fields.password}
              onChange={set('password')}
              placeholder="••••••••"
              autoComplete="new-password"
              className={inputCls(!!errors.password)}
            />
          </FormField>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-violet-600 via-pink-600 to-orange-500 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Creando cuenta…' : 'Crear cuenta'}
          </button>

          <p className="text-center text-sm text-gray-500">
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="text-brand-light transition-colors hover:text-white">
              Inicia sesión
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
