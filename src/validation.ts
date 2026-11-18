import type { AuthMode, AuthValues } from "./types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Every validator returns an error message, or "" when the value is valid.
export function validateName(value: string): string {
  const v = value.trim();
  if (!v) return "Name is required";
  if (v.length < 2) return "Name must be at least 2 characters";
  if (v.length > 50) return "Name must be 50 characters or fewer";
  return "";
}

export function validateEmail(value: string): string {
  const v = value.trim();
  if (!v) return "Email is required";
  if (v.length > 254 || !EMAIL_RE.test(v)) return "Enter a valid email address";
  return "";
}

export function validateNewPassword(value: string): string {
  if (!value) return "Password is required";
  if (value.length < 8) return "Password must be at least 8 characters";
  if (value.length > 100) return "Password must be 100 characters or fewer";
  if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) return "Use at least one letter and one number";
  return "";
}

export function validateConfirm(password: string, confirm: string): string {
  if (!confirm) return "Please confirm your password";
  if (password !== confirm) return "Passwords do not match";
  return "";
}

export function validateSearch(value: string): string {
  if (value.trim().length > 100) return "Search text is too long (max 100 characters)";
  return "";
}

export type AuthErrors = Partial<Record<keyof AuthValues, string>>;

export function validateAuthForm(mode: AuthMode, values: AuthValues): AuthErrors {
  const errors: AuthErrors = {};
  const email = validateEmail(values.email);
  if (email) errors.email = email;

  if (mode === "register") {
    const name = validateName(values.name);
    if (name) errors.name = name;
    const password = validateNewPassword(values.password);
    if (password) errors.password = password;
    const confirm = validateConfirm(values.password, values.confirm);
    if (confirm) errors.confirm = confirm;
  } else if (!values.password) {
    errors.password = "Password is required";
  }
  return errors;
}
