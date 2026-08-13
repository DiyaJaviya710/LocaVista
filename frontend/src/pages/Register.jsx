import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { checkAvailability } from '../services/api';
import { User, Mail, Lock, ArrowRight, KeyRound, CheckCircle2, AlertCircle, ShieldCheck, XCircle, Eye, EyeOff } from 'lucide-react';

export default function Register() {
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [otpStep, setOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [notification, setNotification] = useState('');
  const [loading, setLoading] = useState(false);

  // Availability state
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const [emailAvailable, setEmailAvailable] = useState(null);

  const { requestOTP, register } = useAuth();
  const navigate = useNavigate();

  // Password Strength Rules Validation
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*_\-+]/.test(password);
  const isPasswordValid = hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecial;
  const passwordsMatch = password && confirmPassword && password === confirmPassword;

  // Live Availability Check (Debounced)
  useEffect(() => {
    if (!username && !email) return;

    const timer = setTimeout(async () => {
      try {
        const res = await checkAvailability(username, email);
        if (username) setUsernameAvailable(res.username_available);
        if (email) setEmailAvailable(res.email_available);
      } catch (err) {
        // Ignore live check errors
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [username, email]);

  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (!username || !email || !password || !confirmPassword) {
      setErrorMsg('Please fill in all required registration fields.');
      return;
    }

    if (usernameAvailable === false) {
      setErrorMsg('This username is already taken. Please choose another one.');
      return;
    }

    if (emailAvailable === false) {
      setErrorMsg('This email is already registered. Please use another email or sign in.');
      return;
    }

    if (!isPasswordValid) {
      setErrorMsg('Password does not meet all security requirements listed below.');
      return;
    }

    if (!passwordsMatch) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setErrorMsg('');
    setLoading(true);

    try {
      await requestOTP(email, 'registration');
      setLoading(false);
      setOtpStep(true);
      setNotification(`📩 Verification OTP sent to ${email}. Please check your email inbox!`);
    } catch (err) {
      setLoading(false);
      setErrorMsg(err.message || 'Failed to send OTP code. Please try again.');
    }
  };

  const handleVerifyAndRegister = async (e) => {
    e.preventDefault();
    if (!otpCode) {
      setErrorMsg('Please enter the 6-digit verification code sent to your email.');
      return;
    }

    setErrorMsg('');
    setLoading(true);

    try {
      await register({
        username,
        email,
        password,
        otp_code: otpCode,
        name: name || username,
      });
      setLoading(false);
      // Auto-Login complete: Redirect directly to Home Page (/)
      navigate('/');
    } catch (err) {
      setLoading(false);
      setErrorMsg(err.message || 'Registration failed. Please verify your OTP code and try again.');
    }
  };

  return (
    <div className="mx-auto flex my-8 w-full max-w-md flex-col justify-center font-sans">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/50">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <ShieldCheck size={24} />
          </div>
          <h2 className="mt-4 text-2xl font-bold text-slate-900">
            {otpStep ? 'Verify Registration Email' : 'Create Account'}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {otpStep ? `Enter 6-digit verification code sent to ${email}` : 'Access site intelligence tools'}
          </p>
        </div>

        {notification && (
          <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-3.5 text-xs font-semibold text-blue-800 flex items-center gap-2">
            <CheckCircle2 size={16} className="text-blue-600 shrink-0" />
            <div className="min-w-0 flex-1">{notification}</div>
          </div>
        )}

        {errorMsg && (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-semibold text-rose-700 flex items-center gap-2">
            <AlertCircle size={16} className="text-rose-600 shrink-0" />
            <div>{errorMsg}</div>
          </div>
        )}

        {!otpStep ? (
          <form onSubmit={handleSendOTP} className="mt-6 flex flex-col gap-4">
            {/* Username Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">Username</label>
                {username && (
                  <span className="text-[11px] font-semibold">
                    {usernameAvailable === true && <span className="text-emerald-600 flex items-center gap-1"><CheckCircle2 size={12} /> Available</span>}
                    {usernameAvailable === false && <span className="text-rose-600 flex items-center gap-1"><XCircle size={12} /> Username taken</span>}
                  </span>
                )}
              </div>
              <div className="relative">
                <User className="absolute left-3.5 top-3 text-slate-400" size={18} />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={`w-full rounded-xl border pl-10 pr-4 py-2.5 text-sm text-slate-900 outline-none transition ${usernameAvailable === false ? 'border-rose-300 bg-rose-50/30' : 'border-slate-200 bg-slate-50/50 focus:border-blue-500 focus:bg-white'
                    }`}
                  placeholder="vedant_ahir"
                />
              </div>
            </div>

            {/* Email Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">Email Address</label>
                {email && (
                  <span className="text-[11px] font-semibold">
                    {emailAvailable === true && <span className="text-emerald-600 flex items-center gap-1"><CheckCircle2 size={12} /> Available</span>}
                    {emailAvailable === false && <span className="text-rose-600 flex items-center gap-1"><XCircle size={12} /> Registered</span>}
                  </span>
                )}
              </div>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 text-slate-400" size={18} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full rounded-xl border pl-10 pr-4 py-2.5 text-sm text-slate-900 outline-none transition ${emailAvailable === false ? 'border-rose-300 bg-rose-50/30' : 'border-slate-200 bg-slate-50/50 focus:border-blue-500 focus:bg-white'
                    }`}
                  placeholder="name@email.com"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 text-slate-400" size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-10 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
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

            {/* Confirm Password Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">Confirm Password</label>
                {confirmPassword && (
                  <span className="text-[11px] font-semibold">
                    {passwordsMatch ? (
                      <span className="text-emerald-600 flex items-center gap-1"><CheckCircle2 size={12} /> Passwords match</span>
                    ) : (
                      <span className="text-rose-600 flex items-center gap-1"><XCircle size={12} /> Passwords do not match</span>
                    )}
                  </span>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 text-slate-400" size={18} />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full rounded-xl border pl-10 pr-10 py-2.5 text-sm text-slate-900 outline-none transition ${confirmPassword && !passwordsMatch ? 'border-rose-300 bg-rose-50/30' : 'border-slate-200 bg-slate-50/50 focus:border-blue-500 focus:bg-white'
                    }`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Password Requirements Checklist */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-xs space-y-1.5">
              <p className="font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">Password Requirements:</p>
              <div className={`flex items-center gap-1.5 font-medium ${hasMinLength ? 'text-emerald-700' : 'text-slate-500'}`}>
                {hasMinLength ? <CheckCircle2 size={14} className="text-emerald-600" /> : <XCircle size={14} className="text-slate-400" />}
                <span>Minimum 8 characters</span>
              </div>
              <div className={`flex items-center gap-1.5 font-medium ${hasUppercase ? 'text-emerald-700' : 'text-slate-500'}`}>
                {hasUppercase ? <CheckCircle2 size={14} className="text-emerald-600" /> : <XCircle size={14} className="text-slate-400" />}
                <span>At least 1 uppercase letter (A-Z)</span>
              </div>
              <div className={`flex items-center gap-1.5 font-medium ${hasLowercase ? 'text-emerald-700' : 'text-slate-500'}`}>
                {hasLowercase ? <CheckCircle2 size={14} className="text-emerald-600" /> : <XCircle size={14} className="text-slate-400" />}
                <span>At least 1 lowercase letter (a-z)</span>
              </div>
              <div className={`flex items-center gap-1.5 font-medium ${hasNumber ? 'text-emerald-700' : 'text-slate-500'}`}>
                {hasNumber ? <CheckCircle2 size={14} className="text-emerald-600" /> : <XCircle size={14} className="text-slate-400" />}
                <span>At least 1 number (0-9)</span>
              </div>
              <div className={`flex items-center gap-1.5 font-medium ${hasSpecial ? 'text-emerald-700' : 'text-slate-500'}`}>
                {hasSpecial ? <CheckCircle2 size={14} className="text-emerald-600" /> : <XCircle size={14} className="text-slate-400" />}
                <span>At least 1 special character (!@#$%^&*_-+)</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !isPasswordValid || !passwordsMatch || usernameAvailable === false || emailAvailable === false}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700 shadow-md shadow-blue-600/20 disabled:opacity-50"
            >
              {loading ? 'Sending Code...' : 'Get Registration OTP'} <ArrowRight size={16} />
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyAndRegister} className="mt-6 flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">6-Digit Verification Code</label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-3 text-slate-400" size={18} />
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2.5 text-base font-extrabold tracking-widest text-slate-900 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 font-mono"
                  placeholder="______"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 font-semibold text-white transition hover:bg-emerald-700 shadow-md shadow-emerald-600/20 disabled:opacity-50"
            >
              {loading ? 'Creating Account & Logging In...' : 'Verify OTP & Complete Auto-Login'} <CheckCircle2 size={16} />
            </button>

            <button
              type="button"
              onClick={async () => {
                try {
                  await requestOTP(email, 'registration');
                  setNotification(`Resent Email Verification OTP to ${email}. Please check your inbox!`);
                } catch (e) {
                  setErrorMsg('Failed to resend OTP.');
                }
              }}
              className="text-center text-xs font-semibold text-blue-600 hover:underline pt-1"
            >
              Didn't receive code? Resend OTP
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-xs text-slate-500">
          Already registered?{' '}
          <Link to="/login" className="font-semibold text-blue-600 hover:underline">
            Sign in here
          </Link>
        </p>
      </div>
    </div>
  );
}
