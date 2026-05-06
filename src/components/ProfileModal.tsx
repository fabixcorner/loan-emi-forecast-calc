import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Mail, User as UserIcon, Lock, Loader2, Camera, Trash2, Eye, EyeOff, Check, Circle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AvatarCropModal } from "./AvatarCropModal";
import {
  DB_TABLES,
  STORAGE_BUCKETS,
  AVATAR_CONFIG,
  PASSWORD_RULES,
  PROFILE_FIELD_LIMITS,
} from "@/config";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const emailSchema = z
  .string()
  .trim()
  .min(1, "Email is required")
  .email("Please enter a valid email address")
  .max(PROFILE_FIELD_LIMITS.EMAIL_MAX_LENGTH);
const nameSchema = z
  .string()
  .trim()
  .max(
    PROFILE_FIELD_LIMITS.DISPLAY_NAME_MAX_LENGTH,
    `Name must be less than ${PROFILE_FIELD_LIMITS.DISPLAY_NAME_MAX_LENGTH} characters`,
  );
const passwordSchema = z
  .string()
  .min(PASSWORD_RULES.MIN_LENGTH, `Password must be at least ${PASSWORD_RULES.MIN_LENGTH} characters`)
  .regex(/[a-z]/, "Must include at least one lowercase letter")
  .regex(/[A-Z]/, "Must include at least one uppercase letter")
  .regex(/[0-9]/, "Must include at least one number");

const getPasswordChecks = (pw: string) => ({
  length: pw.length >= PASSWORD_RULES.MIN_LENGTH,
  lowercase: /[a-z]/.test(pw),
  uppercase: /[A-Z]/.test(pw),
  number: /[0-9]/.test(pw),
});

const isEmailValid = (e: string) => emailSchema.safeParse(e).success;

export const ProfileModal = ({ isOpen, onClose }: ProfileModalProps) => {
  const { user, signOut } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string; confirm?: string }>({});
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => {
    if (!isOpen || !user) return;
    const userEmail = user.email ?? "";
    setEmail(userEmail);
    const fallbackName = userEmail.includes("@") ? userEmail.split("@")[0] : "";
    setDisplayName(user.user_metadata?.display_name ?? fallbackName);
    setNewPassword("");
    setConfirmPassword("");
    setErrors({});
    setConfirmingDelete(false);
    setDeleteConfirmText("");
    (async () => {
      const { data } = await supabase
        .from(DB_TABLES.PROFILES)
        .select("display_name, avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        if (data.display_name) setDisplayName(data.display_name);
        setAvatarUrl(data.avatar_url ?? null);
      } else if (fallbackName) {
        setDisplayName(fallbackName);
      }
    })();
  }, [isOpen, user]);

  if (!isOpen || !user) return null;

  const initials = (displayName || email || "U").trim().charAt(0).toUpperCase();

  const passwordChecks = getPasswordChecks(newPassword);
  const passwordChecksPassed = Object.values(passwordChecks).filter(Boolean).length;
  const emailValid = isEmailValid(email);
  const nameValid = nameSchema.safeParse(displayName).success;
  const profileChanged = email !== (user.email ?? "") || displayName !== (user.user_metadata?.display_name ?? "");
  const profileReady = emailValid && nameValid;
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const passwordReady = passwordChecksPassed === 4 && passwordsMatch;

  const handleAvatarFileSelected = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > AVATAR_CONFIG.MAX_FILE_SIZE_BYTES) {
      const mb = Math.round(AVATAR_CONFIG.MAX_FILE_SIZE_BYTES / (1024 * 1024));
      toast.error(`Image must be smaller than ${mb}MB`);
      return;
    }
    setPendingFile(file);
  };

  const handleCroppedUpload = async (blob: Blob) => {
    setUploading(true);
    try {
      const path = `${user.id}/${AVATAR_CONFIG.FILENAME_PREFIX}-${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKETS.AVATARS)
        .upload(path, blob, { upsert: true, contentType: AVATAR_CONFIG.UPLOAD_MIME_TYPE });
      if (uploadError) throw uploadError;

      const { data: pub } = supabase.storage.from(STORAGE_BUCKETS.AVATARS).getPublicUrl(path);
      // Cache-bust so the new image appears immediately
      const publicUrl = `${pub.publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from(DB_TABLES.PROFILES)
        .update({ avatar_url: publicUrl })
        .eq("user_id", user.id);
      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      toast.success("Avatar updated");
      setPendingFile(null);
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
        .from(DB_TABLES.PROFILES)
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
        .from(DB_TABLES.PROFILES)
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

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") return;
    setDeletingAccount(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("You must be signed in");

      const { error } = await supabase.functions.invoke("delete-account", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (error) throw error;

      toast.success("Your account has been deleted");
      await signOut();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete account");
      setDeletingAccount(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[9999] flex items-start sm:items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <Card className="w-full max-w-lg bg-card border-border shadow-2xl animate-fade-in relative my-8" onClick={(e) => e.stopPropagation()}>
        <CardHeader className="relative bg-gradient-to-r from-financial-primary to-financial-success text-primary-foreground rounded-t-lg py-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="absolute right-2 top-2 text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/20"
          >
            <X className="w-4 h-4" />
          </Button>
          <CardTitle className="text-xl">Your Profile</CardTitle>
        </CardHeader>
        <CardContent className="pt-4 pb-4 space-y-5">
          {/* Avatar + Profile fields */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleAvatarFileSelected(file);
              e.target.value = "";
            }}
          />
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => !uploading && fileInputRef.current?.click()}
                disabled={uploading}
                aria-label={avatarUrl ? "Change avatar" : "Upload avatar"}
                className="group relative w-20 h-20 shrink-0 rounded-full overflow-hidden bg-gradient-to-br from-financial-primary to-financial-success flex items-center justify-center text-primary-foreground text-2xl font-semibold ring-2 ring-border focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span>{initials}</span>
                )}
                <span className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-medium gap-0.5">
                  <Camera className="w-5 h-5" />
                  {avatarUrl ? "Change" : "Upload"}
                </span>
                {uploading && (
                  <span className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 animate-spin text-white" />
                  </span>
                )}
              </button>
              <div className="flex-1 min-w-0 space-y-2">
                <div>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="profile-name"
                      value={displayName}
                      onChange={(e) => { setDisplayName(e.target.value); if (errors.name) setErrors({ ...errors, name: undefined }); }}
                      placeholder="Display name"
                      className="pl-10 h-9"
                      aria-invalid={!!errors.name}
                    />
                  </div>
                  {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
                </div>
                <div>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="profile-email"
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors({ ...errors, email: undefined }); }}
                      placeholder="Email"
                      className="pl-10 h-9"
                      aria-invalid={!!errors.email}
                    />
                  </div>
                  {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
                  {!errors.email && email.length > 0 && !emailValid && (
                    <p className="text-xs text-destructive mt-1">Please enter a valid email address</p>
                  )}
                  {email !== user.email && !errors.email && (
                    <p className="text-xs text-muted-foreground mt-1">You'll receive a confirmation link at the new address.</p>
                  )}
                </div>
              </div>
            </div>
            {avatarUrl && (
              <button
                type="button"
                onClick={handleAvatarRemove}
                disabled={uploading}
                className="text-xs text-destructive hover:underline inline-flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                Remove avatar
              </button>
            )}
            <Button onClick={handleProfileSave} disabled={savingProfile || !profileReady} className="w-full">
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
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => { setNewPassword(e.target.value); if (errors.password) setErrors({ ...errors, password: undefined }); }}
                    placeholder="Min. 8 chars, A-z, 0-9"
                    className="pl-10 pr-10"
                    aria-invalid={!!errors.password}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                    aria-label={showNewPassword ? "Hide password" : "Show password"}
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-destructive mt-1">{errors.password}</p>}
                {newPassword.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    <div className="flex gap-1" aria-hidden="true">
                      {[0, 1, 2, 3].map((i) => (
                        <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i < passwordChecksPassed ? (passwordChecksPassed <= 1 ? "bg-destructive" : passwordChecksPassed <= 2 ? "bg-orange-500" : passwordChecksPassed === 3 ? "bg-yellow-500" : "bg-green-500") : "bg-muted"}`} />
                      ))}
                    </div>
                    <ul className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
                      {([
                        ["length", "At least 8 characters"],
                        ["lowercase", "One lowercase letter"],
                        ["uppercase", "One uppercase letter"],
                        ["number", "One number"],
                      ] as const).map(([key, label]) => {
                        const ok = passwordChecks[key];
                        return (
                          <li key={key} className={`flex items-center gap-1.5 ${ok ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
                            {ok ? <Check className="w-3 h-3" /> : <Circle className="w-3 h-3" />}
                            <span>{label}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-[100px_1fr] items-start gap-3">
              <Label htmlFor="profile-confirm-password" className="text-sm text-foreground pt-2">Confirm</Label>
              <div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="profile-confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); if (errors.confirm) setErrors({ ...errors, confirm: undefined }); }}
                    placeholder="Repeat password"
                    className="pl-10 pr-10"
                    aria-invalid={!!errors.confirm}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.confirm && <p className="text-xs text-destructive mt-1">{errors.confirm}</p>}
                {!errors.confirm && confirmPassword.length > 0 && newPassword !== confirmPassword && (
                  <p className="text-xs text-destructive mt-1">Passwords do not match</p>
                )}
              </div>
            </div>
            <Button onClick={handlePasswordSave} disabled={savingPassword || !passwordReady} className="w-full">
              {savingPassword && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Update Password
            </Button>
          </div>

          {/* Delete account */}
          <div className="border-t border-destructive/30 pt-4 space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-destructive">Danger Zone</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Permanently delete your account and all associated data (saved loans, profile, avatar). This cannot be undone.
              </p>
            </div>
            {!confirmingDelete ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmingDelete(true)}
                className="w-full border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete My Account
              </Button>
            ) : (
              <div className="space-y-2 rounded-md border border-destructive/40 bg-destructive/5 p-3">
                <p className="text-xs text-foreground">
                  Type <span className="font-mono font-semibold">DELETE</span> to confirm permanent account deletion.
                </p>
                <Input
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Type DELETE here"
                  className="h-9"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => { setConfirmingDelete(false); setDeleteConfirmText(""); }}
                    disabled={deletingAccount}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={handleDeleteAccount}
                    disabled={deleteConfirmText !== "DELETE" || deletingAccount}
                    className="flex-1"
                  >
                    {deletingAccount && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    Permanently Delete
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      <AvatarCropModal
        isOpen={!!pendingFile}
        file={pendingFile}
        onClose={() => setPendingFile(null)}
        onConfirm={handleCroppedUpload}
      />
    </div>,
    document.body
  );
};