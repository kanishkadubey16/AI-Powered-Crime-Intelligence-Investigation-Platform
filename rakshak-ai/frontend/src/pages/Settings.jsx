import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import PageHeader from "../components/common/PageHeader";
import Input from "../components/common/Input";
import Button from "../components/common/Button";
import api from "../services/api";

const Settings = () => {
  const { user } = useAuth();

  const { register, handleSubmit, formState: { isSubmitting } } = useForm({
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
      badgeNumber: user?.badgeNumber || "",
    },
  });

  const onSubmit = async (data) => {
    try {
      await api.put("/auth/profile", data);
      toast.success("Profile updated");
    } catch {
      toast.error("Update failed");
    }
  };

  const onPasswordChange = async (data) => {
    try {
      await api.put("/auth/change-password", data);
      toast.success("Password changed");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to change password");
    }
  };

  const { register: regPwd, handleSubmit: handlePwd, formState: { isSubmitting: pwdSubmitting } } = useForm();

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Settings" subtitle="Manage your account and preferences" />

      {/* Profile */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5">
        <h3 className="text-slate-100 font-semibold mb-4">Profile Information</h3>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Full Name" {...register("name")} />
          <Input label="Email" type="email" {...register("email")} />
          <Input label="Badge Number" {...register("badgeNumber")} />
          <Button type="submit" loading={isSubmitting}>Save Changes</Button>
        </form>
      </div>

      {/* Password */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5">
        <h3 className="text-slate-100 font-semibold mb-4">Change Password</h3>
        <form onSubmit={handlePwd(onPasswordChange)} className="space-y-4">
          <Input label="Current Password" type="password" {...regPwd("currentPassword")} />
          <Input label="New Password" type="password" {...regPwd("newPassword")} />
          <Input label="Confirm Password" type="password" {...regPwd("confirmPassword")} />
          <Button type="submit" variant="secondary" loading={pwdSubmitting}>Update Password</Button>
        </form>
      </div>

      {/* Danger zone */}
      <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-5">
        <h3 className="text-red-400 font-semibold mb-2">Danger Zone</h3>
        <p className="text-slate-400 text-sm mb-4">Permanently delete your account and all associated data.</p>
        <Button variant="danger">Delete Account</Button>
      </div>
    </div>
  );
};

export default Settings;
