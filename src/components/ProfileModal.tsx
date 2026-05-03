import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Mail, User as UserIcon, Lock, Loader2, Camera, Trash2, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const emailSchema = z.string().trim().min(1, "Email is required").email("Please enter a valid email address").max(255);
const nameSchema = z.string().trim().max(100, "Name must be less than 100 characters");
const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[a-z]/, "Must include at least one lowercase letter")
  .regex(/[A-Z]/, "Must include at least one uppercase letter")
  .regex(/[0-9]/, "Must include at least one number");

export const ProfileModal = ({ isOpen, onClose }: ProfileModalProps) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string; confirm?: string }>({});

  useEffect(() => {
    if (!isOpen || !user) return;
    setEmail(user.email ?? "");
    setDisplayName(user.user_metadata?.display_name ?? "");
    setNewPassword("");
    setConfirmPassword("");
    setErrors({});
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        if (data.display_name) setDisplayName(data.display_name);
        setAvatarUrl(data.avatar_url ?? null);
      }
    })();
  }, [isOpen, user]);

  if (!isOpen || !user) return null;

  const initials = (displayName || email || "U").trim().charAt(0).toUpperCase();

  const handleAvatarUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be smaller than 2MB");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;

      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = pub.publicUrl;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("user_id", user.id);
      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      toast.success("Avatar updated");
    } catch (err: any) {
      toast.error(err.message || "Failed to upload avatar");
    } finally {
      setUploading(false);
    }
  };

  const handleAvatarRemove = async () => {
    setUploading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: null })
        .eq("user_id", user.id);
      if (error) throw error;
      setAvatarUrl(null);
      toast.success("Avatar removed");
    } catch (err: any) {
      toast.error(err.message || "Failed to remove avatar");
    } finally {
      setUploading(false);
    }
  };

  const handleProfileSave = async () => {
    const next: typeof errors = {};
    const nameRes = nameSchema.safeParse(displayName);
    if (!nameRes.success) next.name = nameRes.error.issues[0].message;
    const emailRes = emailSchema.safeParse(email);
    if (!emailRes.success) next.email = emailRes.error.issues[0].message;
    setErrors((e) => ({ ...e, name: next.name, email: next.email }));
    if (next.name || next.email) return;

    setSavingProfile(true);
    try {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ display_name: displayName.trim() || null, email: email.trim() })
        .eq("user_id", user.id);
      if (profileError) throw profileError;

      const updates: any = { data: { display_name: displayName.trim() } };
      if (email.trim() !== user.email) updates.email = email.trim();
      const { error: authError } = await supabase.auth.updateUser(updates);
      if (authError) throw authError;

      if (email.trim() !== user.email) {
        toast.success("Profile saved. Check your inbox to confirm the new email.");
      } else {
        toast.success("Profile saved");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSave = async () => {
    const next: typeof errors = {};
    const r = passwordSchema.safeParse(newPassword);
    if (!r.success) next.password = r.error.issues[0].message;
    if (newPassword !== confirmPassword) next.confirm = "Passwords do not match";
    setErrors((e) => ({ ...e, password: next.password, confirm: next.confirm }));
    if (next.password || next.confirm) return;

    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password updated");
    } catch (err: any) {
      toast.error(err.message || "Failed to update password");
    } finally {
      setSavingPassword(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[9999] flex items-start sm:items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <Card className="w-full max-w-lg bg-card border-border shadow-2xl animate-fade-in relative my-8" onClick={(e) => e.stopPropagation()}>
        <CardHeader className="relative bg-gradient-to-r from-financial-primary to-financial-success text-primary-foreground rounded-t-lg py-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="absolute right-2 top-2 text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/20"
          >
            <X className="w-4 h-4" />
          </Button>
          <CardTitle className="text-xl">Your Profile</CardTitle>
          <p className="text-sm text-primary-foreground/80">Update your display name, email, password, and avatar</p>
        </CardHeader>
        <CardContent className="pt-6 pb-4 space-y-6">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="relative w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-financial-primary to-financial-success flex items-center justify-center text-primary-foreground text-2xl font-semibold ring-2 ring-border">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span>{initials}</span>
              )}
              {uploading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-white" />
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleAvatarUpload(file);
                  e.target.value = "";
                }}
              />
              <Button type="button" size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="gap-2">
                <Camera className="w-4 h-4" />
                {avatarUrl ? "Change avatar" : "Upload avatar"}
              </Button>
              {avatarUrl && (
                <Button type="button" size="sm" variant="ghost" onClick={handleAvatarRemove} disabled={uploading} className="gap-2 text-destructive hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                  Remove
                </Button>
              )}
            </div>
          </div>

          {/* Profile fields */}
          <div className="space-y-3">
            <div className="grid grid-cols-[100px_1fr] items-start gap-3">
              <Label htmlFor="profile-name" className="text-sm text-foreground pt-2">Display Name</Label>
              <div>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="profile-name"
                    value={displayName}
                    onChange={(e) => { setDisplayName(e.target.value); if (errors.name) setErrors({ ...errors, name: undefined }); }}
                    placeholder="John Doe"
                    className="pl-10"
                    aria-invalid={!!errors.name}
                  />
                </div>
                {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
              </div>
            </div>
            <div className="grid grid-cols-[100px_1fr] items-start gap-3">
              <Label htmlFor="profile-email" className="text-sm text-foreground pt-2">Email</Label>
              <div>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="profile-email"
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors({ ...errors, email: undefined }); }}
                    placeholder="you@example.com"
                    className="pl-10"
                    aria-invalid={!!errors.email}
                  />
                </div>
                {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
                {email !== user.email && !errors.email && (
                  <p className="text-xs text-muted-foreground mt-1">You'll receive a confirmation link at the new address.</p>
                )}
              </div>
            </div>
            <Button onClick={handleProfileSave} disabled={savingProfile} className="w-full">
              {savingProfile && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Save Profile
            </Button>
          </div>

          <div className="border-t border-border pt-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Change Password</h3>
            <div className="grid grid-cols-[100px_1fr] items-start gap-3">
              <Label htmlFor="profile-new-password" className="text-sm text-foreground pt-2">New</Label>
              <div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="profile-new-password"
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => { setNewPassword(e.target.value); if (errors.password) setErrors({ ...errors, password: undefined }); }}
                    placeholder="Min. 8 chars, A-z, 0-9"
                    className="pl-10 pr-10"
                    aria-invalid={!!errors.password}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-destructive mt-1">{errors.password}</p>}
              </div>
            </div>
            <div className="grid grid-cols-[100px_1fr] items-start gap-3">
              <Label htmlFor="profile-confirm-password" className="text-sm text-foreground pt-2">Confirm</Label>
              <div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="profile-confirm-password"
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); if (errors.confirm) setErrors({ ...errors, confirm: undefined }); }}
                    placeholder="Repeat password"
                    className="pl-10"
                    aria-invalid={!!errors.confirm}
                  />
                </div>
                {errors.confirm && <p className="text-xs text-destructive mt-1">{errors.confirm}</p>}
              </div>
            </div>
            <Button onClick={handlePasswordSave} disabled={savingPassword || !newPassword || !confirmPassword} className="w-full">
              {savingPassword && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Update Password
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>,
    document.body
  );
};