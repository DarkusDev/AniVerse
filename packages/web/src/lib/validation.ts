export type FieldError = string;

export const validate = {
  email(value: string): FieldError {
    if (!value.trim()) return 'El email es requerido';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Email no válido';
    return '';
  },

  password(value: string): FieldError {
    if (!value) return 'La contraseña es requerida';
    if (value.length < 8) return 'Mínimo 8 caracteres';
    return '';
  },

  username(value: string): FieldError {
    if (!value.trim()) return 'El username es requerido';
    if (value.length < 3) return 'Mínimo 3 caracteres';
    if (value.length > 30) return 'Máximo 30 caracteres';
    if (!/^[a-zA-Z0-9_]+$/.test(value)) return 'Solo letras, números y guiones bajos';
    return '';
  },

  bio(value: string): FieldError {
    if (value.length > 500) return 'Máximo 500 caracteres';
    return '';
  },
};

export function hasErrors(errors: object): boolean {
  return Object.values(errors).some((v) => Boolean(v));
}
