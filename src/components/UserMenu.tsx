import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { User, LogOut, Save, FolderOpen, LogIn } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { AuthModal } from "./AuthModal";
import { SaveLoadModal } from "./SaveLoadModal";
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

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out successfully");
  };

  if (loading) return null;

  if (!user) {
    return (
      <>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAuthModal(true)}
          className="gap-1.5 text-xs border-financial-primary/50 text-financial-primary hover:bg-financial-primary hover:text-white"
        >
          <LogIn className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Sign In</span>
        </Button>
        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      </>
    );
  }

  const displayName = user.user_metadata?.display_name || user.email?.split("@")[0] || "User";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs border-financial-primary/50">
            <div className="w-5 h-5 rounded-full bg-gradient-to-r from-financial-primary to-financial-success flex items-center justify-center">
              <User className="w-3 h-3 text-white" />
            </div>
            <span className="hidden sm:inline max-w-[80px] truncate">{displayName}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem className="text-xs text-muted-foreground cursor-default">
            {user.email}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
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
    </>
  );
};
