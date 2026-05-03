import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { User, LogOut, Save, FolderOpen, UserCog } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { AuthModal } from "./AuthModal";
import { SaveLoadModal } from "./SaveLoadModal";
import { ProfileModal } from "./ProfileModal";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UserMenuProps {
  onLoadCalculation: (data: any) => void;
  getCurrentData: () => any;
}

export const UserMenu = ({ onLoadCalculation, getCurrentData }: UserMenuProps) => {
  const { user, loading, signOut } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [profileName, setProfileName] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setAvatarUrl(null);
      setProfileName(null);
      return;
    }
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("avatar_url, display_name")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!cancelled && data) {
        setAvatarUrl(data.avatar_url ?? null);
        setProfileName(data.display_name ?? null);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [user, showProfileModal]);

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out successfully");
  };

  if (loading) return null;

  if (!user) {
    return (
      <>
        <Button
          onClick={() => setShowAuthModal(true)}
          className="text-sm font-semibold rounded-full px-5 py-2 h-9 bg-gradient-to-b from-financial-primary to-financial-primary/80 text-white shadow-[0_3px_8px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.3)] hover:brightness-110 transition-all duration-200 border-0"
        >
          <span>Login</span>
        </Button>
        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      </>
    );
  }

  const displayName = profileName || user.user_metadata?.display_name || user.email?.split("@")[0] || "User";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs border-financial-primary/50">
            <div className="w-5 h-5 rounded-full bg-gradient-to-r from-financial-primary to-financial-success flex items-center justify-center overflow-hidden">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User className="w-3 h-3 text-white" />
              )}
            </div>
            <span className="hidden sm:inline max-w-[80px] truncate">{displayName}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem className="text-xs text-muted-foreground cursor-default">
            {user.email}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setShowProfileModal(true)} className="gap-2 cursor-pointer">
            <UserCog className="w-4 h-4" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowSaveModal(true)} className="gap-2 cursor-pointer">
            <Save className="w-4 h-4" />
            Save Current
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowLoadModal(true)} className="gap-2 cursor-pointer">
            <FolderOpen className="w-4 h-4" />
            My Saved Loans
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut} className="gap-2 cursor-pointer text-destructive">
            <LogOut className="w-4 h-4" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <SaveLoadModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        mode="save"
        getCurrentData={getCurrentData}
      />
      <SaveLoadModal
        isOpen={showLoadModal}
        onClose={() => setShowLoadModal(false)}
        mode="load"
        onLoadCalculation={onLoadCalculation}
      />
      <ProfileModal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} />
    </>
  );
};
