'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { AuthGuard } from '@/components/AuthGuard';
import { ApiError, usersApi } from '@/lib/api-client';
import { validate, hasErrors } from '@/lib/validation';
import { FormField, inputCls } from '@/components/ui/FormField';
import AniVerseLogo from '@/components/AniVerseLogo';

const API_BASE = process.env['NEXT_PUBLIC_API_URL']?.replace('/api', '') ?? 'http://localhost:3001';

// ─── Avatar ───────────────────────────────────────────────────────────────────

function AvatarPicker({
  currentUrl,
  username,
  preview,
  onSelect,
}: {
  currentUrl: string | null;
  username: string;
  preview: string | null;
  onSelect: (file: File) => void;
}): React.JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileError, setFileError] = useState('');

  const displaySrc = preview ?? (currentUrl ? `${API_BASE}${currentUrl}` : null);
  const initials = username.slice(0, 2).toUpperCase();

  function handleFile(e: React.ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setFileError('Solo JPEG, PNG o WebP');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFileError('Máximo 5 MB');
      return;
    }
    setFileError('');
    onSelect(file);
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="group relative h-24 w-24 overflow-hidden rounded-full border-2 border-surface-border transition-all hover:border-brand/60"
        title="Cambiar avatar"
      >
        {displaySrc ? (
          <Image src={displaySrc} alt="Avatar" fill className="object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-600 to-pink-600 text-2xl font-bold text-white">
            {initials}
          </div>
        )}

        {/* Overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
          <CameraIcon />
        </div>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFile}
        className="hidden"
      />

      {fileError && <p className="text-xs text-red-400">{fileError}</p>}
      {!fileError && (
        <p className="text-xs text-gray-500">
          {preview ? 'Nueva imagen seleccionada' : 'Haz clic para cambiar el avatar'}
        </p>
      )}
    </div>
  );
}

// ─── Profile form ─────────────────────────────────────────────────────────────

interface FormState {
  username: string;
  bio: string;
}

interface FormErrors {
  username: string;
  bio: string;
}

function ProfileForm(): React.JSX.Element {
  const { user, setUser, logout } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState<FormState>({ username: '', bio: '' });
  const [errors, setErrors] = useState<FormErrors>({ username: '', bio: '' });
  const [serverError, setServerError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Avatar
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Inicializar formulario con datos del usuario
  useEffect(() => {
    if (user) {
      setForm({ username: user.username, bio: user.bio ?? '' });
    }
  }, [user]);

  // Limpiar object URL al desmontar o cambiar preview
  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  function setField(key: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
      setErrors((prev) => ({ ...prev, [key]: '' }));
      setSuccessMsg('');
      setServerError('');
    };
  }

  function handleAvatarSelect(file: File): void {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setSuccessMsg('');
    setServerError('');

    const next: FormErrors = {
      username: validate.username(form.username),
      bio: validate.bio(form.bio),
    };
    setErrors(next);
    if (hasErrors(next)) return;

    setLoading(true);
    try {
      const data = new FormData();
      data.append('username', form.username);
      data.append('bio', form.bio);
      if (avatarFile) data.append('avatar', avatarFile);

      const updated = await usersApi.updateMe(data);
      setUser(updated);
      setAvatarFile(null);
      setAvatarPreview(null);
      setSuccessMsg('Perfil actualizado correctamente');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace('/login');
        return;
      }
      setServerError(err instanceof ApiError ? err.message : 'Error inesperado. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  function handleLogout(): void {
    logout();
    router.push('/');
  }

  if (!user) return <></>;

  return (
    <div className="w-full max-w-lg">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <AniVerseLogo size={32} />
          <span className="font-bold text-white">AniVerse</span>
        </Link>
        <button
          onClick={handleLogout}
          className="rounded-lg border border-surface-border px-4 py-2 text-sm text-gray-400 transition-colors hover:border-red-500/40 hover:text-red-400"
        >
          Cerrar sesión
        </button>
      </div>

      <div className="rounded-2xl border border-surface-border bg-surface-elevated p-8">
        <h1 className="mb-6 text-xl font-bold text-white">Mi perfil</h1>

        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          {/* Avatar */}
          <AvatarPicker
            currentUrl={user.avatarUrl}
            username={user.username}
            preview={avatarPreview}
            onSelect={handleAvatarSelect}
          />

          {/* Mensajes */}
          {serverError && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {serverError}
            </div>
          )}
          {successMsg && (
            <div className="rounded-lg border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-400">
              {successMsg}
            </div>
          )}

          {/* Email (solo lectura) */}
          <FormField label="Email">
            <input
              type="email"
              value={user.email}
              readOnly
              className={`${inputCls(false)} cursor-not-allowed opacity-50`}
            />
          </FormField>

          <FormField label="Username" error={errors.username}>
            <input
              type="text"
              value={form.username}
              onChange={setField('username')}
              className={inputCls(!!errors.username)}
            />
          </FormField>

          <FormField
            label="Bio"
            error={errors.bio}
            hint={`${form.bio.length} / 500`}
          >
            <textarea
              value={form.bio}
              onChange={setField('bio')}
              rows={3}
              placeholder="Cuéntanos algo sobre ti…"
              className={`${inputCls(!!errors.bio)} resize-none`}
            />
          </FormField>

          {/* Miembro desde */}
          <p className="text-xs text-gray-600">
            Miembro desde{' '}
            {new Date(user.createdAt).toLocaleDateString('es-ES', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-violet-600 via-pink-600 to-orange-500 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProfilePage(): React.JSX.Element {
  return (
    <AuthGuard>
      <main className="flex min-h-screen justify-center bg-surface px-4 py-12">
        <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
          <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-violet-600/10 blur-[100px]" />
          <div className="absolute -bottom-40 -right-40 h-[400px] w-[400px] rounded-full bg-pink-600/8 blur-[100px]" />
        </div>
        <div className="relative w-full max-w-lg">
          <ProfileForm />
        </div>
      </main>
    </AuthGuard>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function CameraIcon(): React.JSX.Element {
  return (
    <svg
      className="h-6 w-6 text-white"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z"
      />
    </svg>
  );
}
