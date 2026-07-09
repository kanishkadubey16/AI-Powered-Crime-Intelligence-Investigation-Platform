import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import {
  RiMailLine,
  RiLockLine,
  RiEyeLine,
  RiEyeOffLine,
  RiShieldCheckLine,
  RiArrowRightLine,
} from "react-icons/ri";
import { useAuth } from "../context/AuthContext";

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const Login = () => {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);

  // Redirect back to the page they tried to visit
  const from = location.state?.from?.pathname || "/";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (data) => {
    try {
      await login(data);
      toast.success("Welcome back, Officer!", {
        icon: "🛡️",
      });
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || "Invalid credentials. Please try again.");
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full px-3 py-1 mb-5">
          <RiShieldCheckLine className="text-cyan-400 text-sm" />
          <span className="text-cyan-400 text-xs font-medium">Secure Access Portal</span>
        </div>
        <h2 className="text-3xl font-black text-slate-100 tracking-tight">Welcome back</h2>
        <p className="text-slate-400 text-sm mt-2">
          Sign in to access the intelligence platform
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        {/* Email */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-300">Email Address</label>
          <div className="relative">
            <RiMailLine className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-base pointer-events-none" />
            <input
              type="email"
              placeholder="officer@police.gov.in"
              autoComplete="email"
              className={`w-full bg-slate-800/80 border rounded-xl px-4 py-3 pl-10 text-sm text-slate-100 placeholder-slate-600
                focus:outline-none focus:ring-2 transition-all duration-200
                ${errors.email
                  ? "border-red-500/60 focus:ring-red-500/20 focus:border-red-500"
                  : "border-slate-700 focus:ring-cyan-500/20 focus:border-cyan-500"
                }`}
              {...register("email")}
            />
          </div>
          {errors.email && (
            <p className="text-xs text-red-400 flex items-center gap-1 mt-1">
              <span>⚠</span> {errors.email.message}
            </p>
          )}
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-300">Password</label>
          <div className="relative">
            <RiLockLine className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-base pointer-events-none" />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              autoComplete="current-password"
              className={`w-full bg-slate-800/80 border rounded-xl px-4 py-3 pl-10 pr-11 text-sm text-slate-100 placeholder-slate-600
                focus:outline-none focus:ring-2 transition-all duration-200
                ${errors.password
                  ? "border-red-500/60 focus:ring-red-500/20 focus:border-red-500"
                  : "border-slate-700 focus:ring-cyan-500/20 focus:border-cyan-500"
                }`}
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <RiEyeOffLine size={16} /> : <RiEyeLine size={16} />}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-red-400 flex items-center gap-1 mt-1">
              <span>⚠</span> {errors.password.message}
            </p>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting || loading}
          className="w-full flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-60 disabled:cursor-not-allowed
            text-slate-900 font-bold py-3 rounded-xl transition-all duration-200 shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 mt-2"
        >
          {isSubmitting || loading ? (
            <span className="w-5 h-5 border-2 border-slate-900/40 border-t-slate-900 rounded-full animate-spin" />
          ) : (
            <>
              Sign In
              <RiArrowRightLine size={18} />
            </>
          )}
        </button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-3 my-6">
        <div className="flex-1 h-px bg-slate-800" />
        <span className="text-slate-600 text-xs">New to Rakshak AI?</span>
        <div className="flex-1 h-px bg-slate-800" />
      </div>

      <p className="text-center text-sm text-slate-500">
        Don't have an account?{" "}
        <Link
          to="/signup"
          className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
        >
          Register as Officer
        </Link>
      </p>
    </div>
  );
};

export default Login;
