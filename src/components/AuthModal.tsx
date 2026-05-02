import { useState } from "react";
import { createPortal } from "react-dom";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X, Mail, Lock, User, Wand2, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const emailSchema = z.string().trim().min(1, "Email is required").email("Please enter a valid email address").max(255, "Email must be less than 255 characters");
const signinPasswordSchema = z.string().min(1, "Password is required");
const signupPasswordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[a-z]/, "Must include at least one lowercase letter")
  .regex(/[A-Z]/, "Must include at least one uppercase letter")
  .regex(/[0-9]/, "Must include at least one number");

type FieldErrors = { email?: string; password?: string };

export const AuthModal = ({ isOpen, onClose }: AuthModalProps) => {
  const { signInWithPassword, signUp, signInWithMagicLink, resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup" | "magic-link" | "forgot-password">("signin");
  const [errors, setErrors] = useState<FieldErrors>({});

  if (!isOpen) return null;

  const validate = (opts: { email?: boolean; password?: "signin" | "signup" }) => {
    const next: FieldErrors = {};
    if (opts.email) {
      const r = emailSchema.safeParse(email);
      if (!r.success) next.email = r.error.issues[0].message;
    }
    if (opts.password) {
      const schema = opts.password === "signup" ? signupPasswordSchema : signinPasswordSchema;
      const r = schema.safeParse(password);
      if (!r.success) next.password = r.error.issues[0].message;
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate({ email: true, password: "signin" })) return;
    setLoading(true);
    const { error } = await signInWithPassword(email, password);
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Signed in successfully!");
      onClose();
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate({ email: true, password: "signup" })) return;
    setLoading(true);
    const { error } = await signUp(email, password, displayName);
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Check your email to confirm your account!");
      onClose();
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate({ email: true })) return;
    setLoading(true);
    const { error } = await signInWithMagicLink(email);
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Check your email for the login link!");
      onClose();
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate({ email: true })) return;
    setLoading(true);
    const { error } = await resetPassword(email);
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Check your email for the password reset link!");
      setMode("signin");
    }
  };

  const activeTab = mode === "magic-link" ? "signin" : mode === "forgot-password" ? "signin" : mode;
  const switchMode = (m: typeof mode) => {
    setErrors({});
    setMode(m);
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[9999] flex items-center justify-center p-4" onClick={onClose}>
      <Card className="w-full max-w-md bg-card border-border shadow-2xl animate-fade-in relative" onClick={(e) => e.stopPropagation()}>
        <CardHeader className="relative bg-gradient-to-r from-financial-primary to-financial-success text-primary-foreground rounded-t-lg py-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="absolute right-2 top-2 text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/20"
          >
            <X className="w-4 h-4" />
          </Button>
          <CardTitle className="text-xl">
            {mode === "forgot-password" ? "Reset Password" : "Welcome"}
          </CardTitle>
          <p className="text-sm text-primary-foreground/80">
            {mode === "forgot-password"
              ? "Enter your email to receive a reset link"
              : "Sign in to save your loan calculations"}
          </p>
        </CardHeader>
        <CardContent className="pt-6 pb-4">
          {mode === "forgot-password" ? (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="grid grid-cols-[100px_1fr] items-start gap-3">
                <Label htmlFor="reset-email" className="text-sm text-foreground pt-2">Email</Label>
                <div>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="reset-email" type="email" value={email} onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors({ ...errors, email: undefined }); }} placeholder="you@example.com" className="pl-10" aria-invalid={!!errors.email} />
                  </div>
                  {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Send Reset Link
              </Button>
              <Button type="button" variant="link" className="w-full text-sm" onClick={() => switchMode("signin")}>
                Back to Sign In
              </Button>
            </form>
          ) : (
            <Tabs value={activeTab} onValueChange={(v) => switchMode(v as any)}>
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="signin" className="text-xs">Sign In</TabsTrigger>
                <TabsTrigger value="signup" className="text-xs">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                {mode === "magic-link" ? (
                  <form onSubmit={handleMagicLink} className="space-y-4">
                    <p className="text-sm text-muted-foreground">We'll send you a magic link to sign in — no password needed.</p>
                    <div className="grid grid-cols-[100px_1fr] items-start gap-3">
                      <Label htmlFor="magic-email" className="text-sm text-foreground pt-2">Email</Label>
                      <div>
                        <div className="relative">
                          <Wand2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input id="magic-email" type="email" value={email} onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors({ ...errors, email: undefined }); }} placeholder="you@example.com" className="pl-10" aria-invalid={!!errors.email} />
                        </div>
                        {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
                      </div>
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Send Magic Link
                    </Button>
                    <Button type="button" variant="link" className="w-full text-xs text-muted-foreground" onClick={() => switchMode("signin")}>
                      Sign in with password instead
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="grid grid-cols-[100px_1fr] items-start gap-3">
                      <Label htmlFor="signin-email" className="text-sm text-foreground pt-2">Email</Label>
                      <div>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input id="signin-email" type="email" value={email} onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors({ ...errors, email: undefined }); }} placeholder="you@example.com" className="pl-10" aria-invalid={!!errors.email} />
                        </div>
                        {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
                      </div>
                    </div>
                    <div className="grid grid-cols-[100px_1fr] items-start gap-3">
                      <Label htmlFor="signin-password" className="text-sm text-foreground pt-2">Password</Label>
                      <div>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input id="signin-password" type="password" value={password} onChange={(e) => { setPassword(e.target.value); if (errors.password) setErrors({ ...errors, password: undefined }); }} placeholder="••••••••" className="pl-10" aria-invalid={!!errors.password} />
                        </div>
                        {errors.password && <p className="text-xs text-destructive mt-1">{errors.password}</p>}
                      </div>
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Sign In
                    </Button>
                    <div className="flex items-center justify-between">
                      <Button type="button" variant="link" className="text-xs text-muted-foreground p-0 h-auto" onClick={() => switchMode("forgot-password")}>
                        Forgot password?
                      </Button>
                      <Button type="button" variant="link" className="text-xs text-muted-foreground p-0 h-auto" onClick={() => switchMode("magic-link")}>
                        Use Magic Link instead
                      </Button>
                    </div>
                  </form>
                )}
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="grid grid-cols-[100px_1fr] items-center gap-3">
                    <Label htmlFor="signup-name" className="text-sm text-foreground">Display Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="signup-name" type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="John Doe" className="pl-10" />
                    </div>
                  </div>
                  <div className="grid grid-cols-[100px_1fr] items-start gap-3">
                    <Label htmlFor="signup-email" className="text-sm text-foreground pt-2">Email</Label>
                    <div>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input id="signup-email" type="email" value={email} onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors({ ...errors, email: undefined }); }} placeholder="you@example.com" className="pl-10" aria-invalid={!!errors.email} />
                      </div>
                      {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
                    </div>
                  </div>
                  <div className="grid grid-cols-[100px_1fr] items-start gap-3">
                    <Label htmlFor="signup-password" className="text-sm text-foreground pt-2">Password</Label>
                    <div>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input id="signup-password" type="password" value={password} onChange={(e) => { setPassword(e.target.value); if (errors.password) setErrors({ ...errors, password: undefined }); }} placeholder="Min. 8 chars, A-z, 0-9" className="pl-10" aria-invalid={!!errors.password} />
                      </div>
                      {errors.password ? (
                        <p className="text-xs text-destructive mt-1">{errors.password}</p>
                      ) : (
                        <p className="text-xs text-muted-foreground mt-1">Min 8 chars with uppercase, lowercase, and a number. Symbols allowed.</p>
                      )}
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Create Account
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>,
    document.body
  );
};