"use client";
import { useState, Suspense, useEffect } from "react";
import { useAuth } from "../services/AuthProvider";
import { useRouter, useSearchParams } from "next/navigation";
import CircularProgress from "@mui/material/CircularProgress";
import { FaEye, FaEyeSlash, FaShieldAlt } from "react-icons/fa";
import toast from "react-hot-toast";
import { MdAdminPanelSettings } from "react-icons/md";
import { FcGoogle } from "react-icons/fc";

function LoginContent() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [eye, setEye] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const {
    user: existingUser,
    loading: existingUserloading,
    setUser,
    error: sessionError,
  } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get("returnUrl") || "/dashboard";
  const googleError = {
    google_login_failed: "Google sign-in failed. Please try again.",
    google_login_cancelled: "Google sign-in was cancelled.",
    google_account_conflict:
      "This Google account cannot be linked to the existing user.",
    google_no_access: "This Google account doesn't have access to the admin panel.",
    google_unavailable:
      "Google sign-in is not configured. Please contact the administrator.",
  }[searchParams.get("error")];
  const visibleError = error || googleError || sessionError;

  useEffect(() => {
    if (!existingUserloading && existingUser) {
      router.push(returnUrl);
    }
  }, [existingUser, existingUserloading, returnUrl, router]);

  const handleShowPass = () => setEye(!eye);
  const handleGoogleLogin = () => {
    setGoogleLoading(true);
    // A full-page load on purpose: this API route redirects to Google, which router.push can't follow.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign(
      `/api/auth/google/start?returnUrl=${encodeURIComponent(returnUrl)}`,
    );
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Invalid email or password.");
      }

      setUser(data.user);
      router.push(returnUrl);
      toast.success("Login successful");
    } catch (err) {
      setError(err.message || "Unable to sign in. Please try again.");
      toast.error(err.message || "Unable to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  if (existingUserloading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <CircularProgress />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      {/* Background Pattern */}

      <div className="relative w-full max-w-md">
        {/* Header Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-4 shadow-lg">
            <MdAdminPanelSettings className="text-3xl text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Admin Portal</h1>
          <p className="text-slate-400">Sign in to your dashboard</p>
        </div>

        {/* Login Card */}
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl shadow-2xl p-8">
          <form onSubmit={handleEmailLogin} className="space-y-6">
            {/* Email Field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200 block">
                Email Address
              </label>
              <div className="relative">
                <input
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200"
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  placeholder="admin@company.com"
                  value={email}
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200 block">
                Password
              </label>
              <div className="relative">
                <input
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 pr-12"
                  onChange={(e) => setPassword(e.target.value)}
                  type={eye ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  required
                />
                <button
                  type="button"
                  onClick={handleShowPass}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white transition-colors duration-200"
                >
                  {eye ? (
                    <FaEyeSlash className="text-lg" />
                  ) : (
                    <FaEye className="text-lg" />
                  )}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {visibleError && (
              <div className="bg-red-500/20 border border-red-500/30 text-red-300 text-sm py-3 px-4 rounded-xl backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <FaShieldAlt className="text-red-400" />
                  {visibleError}
                </div>
              </div>
            )}

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02] hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <CircularProgress size={20} color="inherit" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <FaShieldAlt />
                  <span>Sign In to Dashboard</span>
                </>
              )}
            </button>

            <div className="relative flex items-center justify-center py-1">
              <div className="w-full h-px bg-white/20"></div>
              <div className="absolute bg-slate-800 px-4">
                <span className="text-sm text-slate-400">Or continue with</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={googleLoading || loading}
              className="w-full bg-white hover:bg-slate-100 text-slate-800 font-medium py-3 px-6 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              {googleLoading ? (
                <CircularProgress size={20} />
              ) : (
                <FcGoogle className="text-2xl" />
              )}
              <span>Continue with Google</span>
            </button>

          </form>
        </div>

        {/* Security Notice */}
        <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-2 text-xs text-slate-500 bg-white/5 backdrop-blur-sm border border-white/10 rounded-full px-4 py-2">
            <FaShieldAlt className="text-green-400" />
            <span>Secured with enterprise-grade encryption</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginForm() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-8">
            <CircularProgress sx={{ color: "white" }} />
          </div>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
