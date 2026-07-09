import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  RiUserLine,
  RiMailLine,
  RiLockLine,
  RiEyeLine,
  RiEyeOffLine,
  RiIdCardLine,
  RiArrowRightLine,
  RiShieldCheckLine,
} from "react-icons/ri";
import { useAuth } from "../context/AuthContext";

const schema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Enter a valid email address"),
    badgeNumber: z
      .string()
      .min(3, "Badge number required")
      .regex(/^[A-Z0-9-]+$/i, "Only letters, numbers and hyphens"),
    role: z.enum(["officer", "investigator", "analyst", "admin"], {
      errorMap: () => ({ message: "Select a valid role" }),
    }),
    department: z.string().min(2, "Department is required"),
    password: z
      .string()
      .min(8, "Minimum 8 characters")
      .regex(/[A-Z]/, "Must contain an uppercase letter")
      .regex(/[0-9]/, "Must contain a number"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

const roles = [
  { value: "", label: "Select your role" },
  { value: "officer", label: "Police Officer" },
  { value: "investigator", label: "Investigator" },
  { value: "analyst", label: "Crime Analyst" },
  { value: "admin", label: "Administrator" },
];

const PasswordStrength = ({ password }) => {
  if (!password) return null;
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const score = checks.filter(Boolean).length;
  const labels = ["", "Weak", "Fair", "Good", "Strong"];
  const colors = ["", "bg-red-500", "bg-amber-500", "bg-yellow-400", "bg-emerald-500"];

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              i <= score ? colors[score] : "bg-slate-700"
            }`}
          />
        ))}
      </div>
      <p className={`text-xs ${score <= 1 ? "text-red-400" : score === 2 ? "text-amber-400" : score === 3 ? "text-yellow-400" : "text-emerald-400"}`}>
        {labels[score]} password
      </p>
    </div>
  );
};

const FieldError = ({ message }) =>
  message ? (
    <p className="text-xs text-red-400 flex items-center gap-1 mt-1">
      <span>⚠</span> {message}
    </p>
  ) : null;

const inputClass = (hasError) =>
  `w-full bg-slate-800/80 border rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600
   focus:outline-none focus:ring-2 transition-all duration-200
   ${hasError
     ? "border-red-500/60 focus:ring-red-500/20 focus:border-red-500"
     : "border-slate-700 focus:ring-cyan-500/20 focus:border-cyan-500"
   }`;

const Signup = () => {
  const { signup, loading } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) });

  const passwordValue = watch("password", "");

  const onSubmit = async (data) => {
    const { confirmPassword, ...payload } = data;
    try {
      await signup(payload);
      toast.success("Account created! Welcome to Rakshak AI.", { icon: "🛡️" });
      navigate("/");
    } catch (err) {
      toast.error(err.response?.data?.message || "Registration failed. Please try again.");
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-7">
        <div className="inline-flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full px-3 py-1 mb-5">
          <RiShieldCheckLine className="text-cyan-400 text-sm" />
          <span className="text-cyan-400 text-xs font-medium">Officer Registration</span>
        </div>
        <h2 className="text-3xl font-black text-slate-100 tracking-tight">Create account</h2>
        <p className="text-slate-400 text-sm mt-2">
          Register as a verified law enforcement officer
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {/* Name */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-300">Full Name</label>
          <div className="relative">
            <RiUserLine className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-base pointer-events-none" />
            <input
              placeholder="Inspector Rajesh Kumar"
              autoComplete="name"
              className={`${inputClass(errors.name)} pl-10`}
              {...register("name")}
            />
          </div>
          <FieldError message={errors.name?.message} />
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-300">Official Email</label>
          <div className="relative">
            <RiMailLine className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-base pointer-events-none" />
            <input
              type="email"
              placeholder="officer@police.gov.in"
              autoComplete="email"
              className={`${inputClass(errors.email)} pl-10`}
              {...register("email")}
            />
          </div>
          <FieldError message={errors.email?.message} />
        </div>

        {/* Badge + Role */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-300">Badge Number</label>
            <div className="relative">
              <RiIdCardLine className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-base pointer-events-none" />
              <input
                placeholder="IPS-2024"
                className={`${inputClass(errors.badgeNumber)} pl-10`}
                {...register("badgeNumber")}
              />
            </div>
            <FieldError message={errors.badgeNumber?.message} />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-300">Role</label>
            <select
              className={`${inputClass(errors.role)} appearance-none`}
              {...register("role")}
            >
              {roles.map((r) => (
                <option key={r.value} value={r.value} disabled={r.value === ""}>
                  {r.label}
                </option>
              ))}
            </select>
            <FieldError message={errors.role?.message} />
          </div>
        </div>

        {/* Department */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-300">Department</label>
          <input
            placeholder="e.g. Mumbai Crime Branch"
            className={inputClass(errors.department)}
            {...register("department")}
          />
          <FieldError message={errors.department?.message} />
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-300">Password</label>
          <div className="relative">
            <RiLockLine className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-base pointer-events-none" />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Min 8 chars, 1 uppercase, 1 number"
              autoComplete="new-password"
              className={`${inputClass(errors.password)} pl-10 pr-11`}
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
          <PasswordStrength password={passwordValue} />
          <FieldError message={errors.password?.message} />
        </div>

        {/* Confirm Password */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-300">Confirm Password</label>
          <div className="relative">
            <RiLockLine className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-base pointer-events-none" />
            <input
              type={showConfirm ? "text" : "password"}
              placeholder="Re-enter your password"
              autoComplete="new-password"
              className={`${inputClass(errors.confirmPassword)} pl-10 pr-11`}
              {...register("confirmPassword")}
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              tabIndex={-1}
            >
              {showConfirm ? <RiEyeOffLine size={16} /> : <RiEyeLine size={16} />}
            </button>
          </div>
          <FieldError message={errors.confirmPassword?.message} />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting || loading}
          className="w-full flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-60 disabled:cursor-not-allowed
            text-slate-900 font-bold py-3 rounded-xl transition-all duration-200 shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 mt-1"
        >
          {isSubmitting || loading ? (
            <span className="w-5 h-5 border-2 border-slate-900/40 border-t-slate-900 rounded-full animate-spin" />
          ) : (
            <>
              Create Account
              <RiArrowRightLine size={18} />
            </>
          )}
        </button>
      </form>

      <p className="text-center text-sm text-slate-500 mt-6">
        Already registered?{" "}
        <Link
          to="/login"
          className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
};

export default Signup;
