import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { requestPasswordReset, confirmResetPassword } from '../services/api';
import { Lock, Mail, ArrowRight, ShieldCheck, AlertCircle, KeyRound, CheckCircle2, X, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStep, setForgotStep] = useState(1); // 1: Email, 2: OTP & New Password
  const [forgotOtp, setForgotOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [forgotMsg, setForgotMsg] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please enter both email/username and password.');
      return;
    }
    setErrorMsg('');
    setLoading(true);

    try {
      await login(email, password);
      setLoading(false);
      navigate('/');
    } catch (err) {
      setLoading(false);
      setErrorMsg(err.message || 'Invalid email/username or password. Please try again.');
    }
  };

  const handleRequestForgot = async (e) => {
    e.preventDefault();
    if (!forgotEmail) {
      setForgotError('Please enter your registered email address.');
      return;
    }
    setForgotError('');
    setForgotLoading(true);
    try {
      await requestPasswordReset(forgotEmail);
      setForgotLoading(false);
      setForgotStep(2);
      setForgotMsg(`📩 Verification OTP sent to ${forgotEmail}. Please check your email inbox!`);
    } catch (err) {
      setForgotLoading(false);
      setForgotError(err.message || 'Failed to send reset code.');
    }
  };

  const handleConfirmReset = async (e) => {
    e.preventDefault();
    if (!forgotOtp || !newPassword) {
      setForgotError('Please enter the OTP code and your new password.');
      return;
    }
    setForgotError('');
    setForgotLoading(true);
    try {
      await confirmResetPassword({
        email: forgotEmail,
        otp_code: forgotOtp,
        new_password: newPassword,
      });
      setForgotLoading(false);
      setShowForgotModal(false);
      setErrorMsg('');
      alert('Password reset successful! Please sign in with your new password.');
    } catch (err) {
      setForgotLoading(false);
      setForgotError(err.message || 'Password reset failed.');
    }
  };

  return (
    <div className="mx-auto flex my-8 w-full max-w-md flex-col justify-center font-sans">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/50">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <ShieldCheck size={24} />
          </div>
          <h2 className="mt-4 text-2xl font-bold text-slate-900">Welcome Back</h2>
          <p className="mt-1 text-sm text-slate-500">Sign in to your location intelligence portal</p>
        </div>

        {errorMsg && (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-semibold text-rose-700 flex items-center gap-2">
            <AlertCircle size={16} className="text-rose-600 shrink-0" />
            <div>{errorMsg}</div>
          </div>
        )}

        <form onSubmit={handleLoginSubmit} className="mt-6 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 text-slate-400" size={18} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 font-sans"
                placeholder="Enter your registered email"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">Password</label>
              <button
                type="button"
                onClick={() => {
                  setForgotEmail(email);
                  setForgotStep(1);
                  setForgotError('');
                  setForgotMsg('');
                  setShowForgotModal(true);
                }}
                className="text-xs font-semibold text-blue-600 hover:underline"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 text-slate-400" size={18} />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-10 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 font-sans"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700 shadow-md shadow-blue-600/20 disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Sign In'} <ArrowRight size={16} />
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-500">
          Don't have an enterprise account?{' '}
          <Link to="/register" className="font-semibold text-blue-600 hover:underline">
            Register here
          </Link>
        </p>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl relative font-sans">
            <button
              onClick={() => setShowForgotModal(false)}
              className="absolute right-4 top-4 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X size={18} />
            </button>

            <h3 className="text-lg font-bold text-slate-900">Reset Your Password</h3>
            <p className="mt-1 text-xs text-slate-500">
              {forgotStep === 1
                ? 'Enter your registered email address to receive a 6-digit verification code.'
                : 'Enter the 6-digit code sent to your email and set your new password.'}
            </p>

            {forgotMsg && (
              <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs font-semibold text-blue-800 flex items-center gap-2">
                <CheckCircle2 size={15} className="text-blue-600 shrink-0" />
                <div>{forgotMsg}</div>
              </div>
            )}

            {forgotError && (
              <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700 flex items-center gap-2">
                <AlertCircle size={15} className="text-rose-600 shrink-0" />
                <div>{forgotError}</div>
              </div>
            )}

            {forgotStep === 1 ? (
              <form onSubmit={handleRequestForgot} className="mt-4 flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
                    placeholder="name@company.com"
                  />
                </div>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="rounded-xl bg-blue-600 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {forgotLoading ? 'Sending Reset Code...' : 'Send Reset Code'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleConfirmReset} className="mt-4 flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">6-Digit Verification Code</label>
                  <input
                    type="text"
                    maxLength={6}
                    required
                    value={forgotOtp}
                    onChange={(e) => setForgotOtp(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm font-mono tracking-widest text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
                    placeholder="______"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">New Password</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-3.5 pr-10 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
                      placeholder="Minimum 6 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
                      aria-label={showNewPassword ? "Hide password" : "Show password"}
                    >
                      {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="rounded-xl bg-emerald-600 py-2.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {forgotLoading ? 'Updating Password...' : 'Reset Password'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
