import React, { useState } from 'react';
import {
  Ship,
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Anchor,
  Box,
  Truck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const { showToast } = useToast();

  const [email, setEmail] = useState('admin@haicontainer.id');
  const [password, setPassword] = useState('admin123');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeRoleBadge, setActiveRoleBadge] = useState<string | null>('Super Admin');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email.trim()) {
      setErrorMsg('Alamat email wajib diisi.');
      return;
    }
    if (!password) {
      setErrorMsg('Kata sandi wajib diisi.');
      return;
    }

    setLoading(true);

    try {
      const res = await login(email.trim(), password, rememberMe);
      if (res.success) {
        showToast(
          'success',
          'Autentikasi Berhasil',
          `Selamat datang di HAI CONTAINER Terminal Operating System.`
        );
      } else {
        setErrorMsg(res.error || 'Email atau kata sandi tidak cocok. Silakan periksa kembali.');
        showToast('error', 'Login Gagal', res.error || 'Kredensial tidak valid.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
      showToast('error', 'Kesalahan Sistem', msg);
    } finally {
      setLoading(false);
    }
  };

  const applyRolePreset = (roleEmail: string, rolePass: string, roleName: string) => {
    setEmail(roleEmail);
    setPassword(rolePass);
    setErrorMsg('');
    setActiveRoleBadge(roleName);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-10 sm:px-6 lg:px-8 relative overflow-hidden select-none">
      {/* Structural grid & ambient background */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-35 pointer-events-none" />
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        {/* Brand identity header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-b from-blue-500 to-blue-700 text-white shadow-xl shadow-blue-600/25 border border-blue-400/20">
            <Ship className="w-8 h-8" />
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-950/80 border border-blue-800/80 text-blue-400 text-[10px] font-bold tracking-wider uppercase mb-1">
              <Anchor className="w-3 h-3" />
              Terminal Operating System (TOS)
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
              HAI CONTAINER
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
              Portal Otorisasi & Manajemen Operasional Terminal Peti Kemas
            </p>
          </div>
        </div>

        {/* Login Box */}
        <div className="mt-7 bg-slate-900/95 border border-slate-800/90 rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-sm">
          {/* Card Header */}
          <div className="mb-5 pb-3.5 border-b border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-white uppercase tracking-wider block">
                Masuk ke Sistem
              </span>
              <span className="text-[11px] text-slate-400">
                Silakan autentikasi identitas staf terminal
              </span>
            </div>
            <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/80 px-2.5 py-1 rounded-full border border-emerald-800/80 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              AUTH PROTECTED
            </span>
          </div>

          {/* Mandatory Login Notice */}
          <div className="mb-4 p-2.5 rounded-xl bg-blue-950/50 border border-blue-800/60 text-blue-200 text-xs flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
            <span className="text-[11px] leading-tight">
              <strong>Autentikasi Wajib:</strong> Silakan login terlebih dahulu untuk mengakses modul operasional terminal.
            </span>
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div
              id="login-error-banner"
              className="mb-4 p-3 rounded-xl bg-rose-950/70 border border-rose-800/90 text-rose-200 text-xs flex items-start gap-2.5 animate-in fade-in duration-200"
            >
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">
                <span className="font-bold block">Gagal Masuk</span>
                <span>{errorMsg}</span>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div>
              <label
                htmlFor="login-email"
                className="block text-xs font-semibold text-slate-300 mb-1.5"
              >
                Alamat Email Pengguna <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="login-email"
                  type="email"
                  required
                  autoFocus
                  autoComplete="email"
                  placeholder="admin@haicontainer.id"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setActiveRoleBadge(null);
                  }}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition font-medium"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="login-password"
                  className="block text-xs font-semibold text-slate-300"
                >
                  Kata Sandi (Password) <span className="text-rose-400">*</span>
                </label>
                <span className="text-[10px] text-slate-400">Min. 6 Karakter</span>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setActiveRoleBadge(null);
                  }}
                  className="w-full pl-9 pr-10 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition p-1"
                  aria-label={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Remember Me & Help */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-3.5 h-3.5 rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900 transition"
                />
                <span className="text-[11px] text-slate-400 group-hover:text-slate-300 transition">
                  Ingat sesi di perangkat ini
                </span>
              </label>

              <span className="text-[10px] text-blue-400/90 font-medium">
                Tanjung Priok T-01
              </span>
            </div>

            {/* Submit Button */}
            <button
              id="submit-login-btn"
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 transition shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 disabled:opacity-50 mt-3 group"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Mengautentikasi Staf...</span>
                </>
              ) : (
                <>
                  <span>Masuk ke Sistem TOS</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>

          {/* Quick Role Fill Presets */}
          <div className="mt-6 pt-5 border-t border-slate-800/80">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                Pilih Akun Demo Staf:
              </span>
              {activeRoleBadge && (
                <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  {activeRoleBadge} Aktif
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              {/* Admin */}
              <button
                type="button"
                id="preset-admin-btn"
                onClick={() => applyRolePreset('admin@haicontainer.id', 'admin123', 'Super Admin')}
                className={`p-2 rounded-xl border text-left transition flex flex-col items-start gap-1 ${
                  activeRoleBadge === 'Super Admin'
                    ? 'bg-blue-950/80 border-blue-600 text-white'
                    : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700 text-slate-300'
                }`}
              >
                <div className="w-6 h-6 rounded-lg bg-blue-600/30 flex items-center justify-center text-blue-400">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
                <div className="leading-none">
                  <span className="text-[11px] font-bold block">Admin</span>
                  <span className="text-[9px] text-slate-400">Manager</span>
                </div>
              </button>

              {/* Operator */}
              <button
                type="button"
                id="preset-operator-btn"
                onClick={() => applyRolePreset('operator@haicontainer.id', 'operator123', 'Operator')}
                className={`p-2 rounded-xl border text-left transition flex flex-col items-start gap-1 ${
                  activeRoleBadge === 'Operator'
                    ? 'bg-emerald-950/80 border-emerald-600 text-white'
                    : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700 text-slate-300'
                }`}
              >
                <div className="w-6 h-6 rounded-lg bg-emerald-600/30 flex items-center justify-center text-emerald-400">
                  <Truck className="w-3.5 h-3.5" />
                </div>
                <div className="leading-none">
                  <span className="text-[11px] font-bold block">Operator</span>
                  <span className="text-[9px] text-slate-400">Gate & Yard</span>
                </div>
              </button>

              {/* Supervisor */}
              <button
                type="button"
                id="preset-supervisor-btn"
                onClick={() => applyRolePreset('supervisor@haicontainer.id', 'supervisor123', 'Supervisor')}
                className={`p-2 rounded-xl border text-left transition flex flex-col items-start gap-1 ${
                  activeRoleBadge === 'Supervisor'
                    ? 'bg-amber-950/80 border-amber-600 text-white'
                    : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700 text-slate-300'
                }`}
              >
                <div className="w-6 h-6 rounded-lg bg-amber-600/30 flex items-center justify-center text-amber-400">
                  <Box className="w-3.5 h-3.5" />
                </div>
                <div className="leading-none">
                  <span className="text-[11px] font-bold block">Supervisor</span>
                  <span className="text-[9px] text-slate-400">Operations</span>
                </div>
              </button>
            </div>

            <div className="mt-3 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 text-[10px] text-slate-400 flex items-center justify-between">
              <span>Kredensial Default Admin:</span>
              <span className="font-mono text-slate-300 font-semibold">admin@haicontainer.id / admin123</span>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-6 text-center space-y-1">
          <p className="text-[11px] text-slate-400 font-medium">
            © {new Date().getFullYear()} HAI CONTAINER Terminal Operating System
          </p>
          <p className="text-[10px] text-slate-500">
            Pelabuhan Tanjung Priok Terminal 01 • ISO 27001 & ISPS Code Compliant
          </p>
        </div>
      </div>
    </div>
  );
};
