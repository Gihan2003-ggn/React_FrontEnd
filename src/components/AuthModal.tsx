import { ChangeEvent, FormEvent, useState } from "react";
import { ArrowRight, AudioLines, Eye, EyeOff, X } from "lucide-react";
import type { AuthMode, AuthValues } from "../types";
import { validateAuthForm } from "../validation";

interface Props {
  mode: AuthMode;
  busy: boolean;
  serverError: string;
  onModeChange: (mode: AuthMode) => void;
  onClose: () => void;
  onSubmit: (mode: AuthMode, values: AuthValues) => void;
}

const EMPTY: AuthValues = { name: "", email: "", password: "", confirm: "" };

function AuthForm({ mode, busy, serverError, onSubmit }: Pick<Props, "mode" | "busy" | "serverError" | "onSubmit">) {
  const [values, setValues] = useState<AuthValues>(EMPTY);
  const [touched, setTouched] = useState<Partial<Record<keyof AuthValues, boolean>>>({});
  const [showPassword, setShowPassword] = useState(false);

  const errors = validateAuthForm(mode, values);
  const fieldError = (field: keyof AuthValues) => (touched[field] ? errors[field] : undefined);

  const bind = (field: keyof AuthValues) => ({
    name: field,
    value: values[field],
    onChange: (e: ChangeEvent<HTMLInputElement>) => setValues({ ...values, [field]: e.target.value }),
    onBlur: () => setTouched({ ...touched, [field]: true }),
    "aria-invalid": Boolean(fieldError(field))
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched({ name: true, email: true, password: true, confirm: true });
    if (Object.keys(errors).length > 0) return; // show the messages, don't call the server
    onSubmit(mode, values);
  }

  const message = (field: keyof AuthValues) =>
    fieldError(field) ? <span className="field-error">{fieldError(field)}</span> : null;

  return (
    <form onSubmit={handleSubmit} noValidate>
      {mode === "register" && (
        <label>
          Your name
          <input {...bind("name")} autoComplete="name" placeholder="Kasun Perera" maxLength={50} />
          {message("name")}
        </label>
      )}
      <label>
        Email address
        <input {...bind("email")} type="email" autoComplete="email" placeholder="you@example.com" maxLength={254} />
        {message("email")}
      </label>
      <label>
        Password
        <span className="password-field">
          <input
            {...bind("password")}
            type={showPassword ? "text" : "password"}
            autoComplete={mode === "register" ? "new-password" : "current-password"}
            placeholder="••••••••"
            maxLength={100}
          />
          <button
            type="button"
            className="icon-btn"
            onClick={() => setShowPassword(!showPassword)}
            title={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </span>
        {message("password")}
        {mode === "register" && !fieldError("password") && (
          <span className="field-hint">At least 8 characters, with a letter and a number</span>
        )}
      </label>
      {mode === "register" && (
        <label>
          Confirm password
          <input
            {...bind("confirm")}
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="••••••••"
            maxLength={100}
          />
          {message("confirm")}
        </label>
      )}
      {serverError && <div className="auth-error" role="alert">{serverError}</div>}
      <button className="primary-btn full" disabled={busy}>
        {busy ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"} <ArrowRight size={16} />
      </button>
    </form>
  );
}

export default function AuthModal({ mode, busy, serverError, onModeChange, onClose, onSubmit }: Props) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <button className="modal-close" onClick={onClose} title="Close"><X size={19} /></button>
        <div className="brand modal-brand">
          <div className="brand-mark"><AudioLines size={22} /></div>
          <span>sonora<span className="brand-dot">.</span></span>
        </div>
        <div className="eyebrow">YOUR MUSIC, YOUR WORLD</div>
        <h2>{mode === "login" ? "Welcome back." : "Find your frequency."}</h2>
        <p>
          {mode === "login"
            ? "Sign in to see your favourite songs."
            : "Create an account to save your favourite songs."}
        </p>
        {/* key resets the form (values + errors) when switching between sign in / sign up */}
        <AuthForm key={mode} mode={mode} busy={busy} serverError={serverError} onSubmit={onSubmit} />
        <div className="auth-switch">
          {mode === "login" ? "New to Sonora?" : "Already have an account?"}{" "}
          <button onClick={() => onModeChange(mode === "login" ? "register" : "login")}>
            {mode === "login" ? "Create account" : "Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}
