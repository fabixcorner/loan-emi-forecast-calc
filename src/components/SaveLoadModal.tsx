import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Save, Trash2, FolderOpen, Loader2, Clock, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Json } from "@/integrations/supabase/types";
import { DB_TABLES, DEFAULT_SCORING_WEIGHTS } from "@/config";

interface SaveLoadModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "save-new" | "load";
  getCurrentData?: () => any;
  onLoadCalculation?: (data: any) => void;
  onSaved?: (id: string, name: string) => void;
}

interface SavedCalc {
  id: string;
  name: string;
  loan_amount: number;
  interest_rate: number;
  loan_tenure: number;
  start_month: number;
  start_year: number;
  part_payments: Json | null;
  comparison_scenarios: Json | null;
  scoring_weights: Json | null;
  affordability_inputs: Json | null;
  created_at: string;
  updated_at: string;
}

const formatCurrency = (amount: number): string => {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)} Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)} L`;
  return `₹${amount.toLocaleString("en-IN")}`;
};

export const SaveLoadModal = ({ isOpen, onClose, mode, getCurrentData, onLoadCalculation, onSaved }: SaveLoadModalProps) => {
  const { user } = useAuth();
  const [saveName, setSaveName] = useState("");
  const [savedCalcs, setSavedCalcs] = useState<SavedCalc[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [duplicateCalc, setDuplicateCalc] = useState<SavedCalc | null>(null);

  useEffect(() => {
    if (isOpen && user) fetchSavedCalcs();
    if (!isOpen) {
      setSaveName("");
      setDuplicateCalc(null);
    }
  }, [isOpen, user]);

  const fetchSavedCalcs = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from(DB_TABLES.SAVED_CALCULATIONS)
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      toast.error("Failed to load saved calculations");
    } else {
      setSavedCalcs(data || []);
    }
    setLoading(false);
  };

  const performSave = async (replaceId?: string) => {
    if (!user || !getCurrentData) return;
    const trimmed = saveName.trim();
    if (!trimmed) {
      toast.error("Please enter a name for this calculation");
      return;
    }
    setLoading(true);
    const currentData = getCurrentData();
    const payload = {
      user_id: user.id,
      name: trimmed,
      loan_amount: currentData.loanAmount,
      interest_rate: currentData.interestRate,
      loan_tenure: currentData.loanTenure,
      start_month: currentData.startMonth,
      start_year: currentData.startYear,
      part_payments: currentData.partPayments as unknown as Json,
      comparison_scenarios: currentData.comparisonScenarios as unknown as Json,
      scoring_weights: currentData.scoringWeights as unknown as Json,
      affordability_inputs: currentData.affordabilityInputs as unknown as Json,
    };

    let savedId: string | null = null;
    let error: any = null;
    if (replaceId) {
      const { data, error: updErr } = await supabase
        .from(DB_TABLES.SAVED_CALCULATIONS)
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq("id", replaceId)
        .select("id")
        .maybeSingle();
      error = updErr;
      savedId = data?.id ?? replaceId;
    } else {
      const { data, error: insErr } = await supabase
        .from(DB_TABLES.SAVED_CALCULATIONS)
        .insert(payload)
        .select("id")
        .maybeSingle();
      error = insErr;
      savedId = data?.id ?? null;
    }

    setLoading(false);
    if (error || !savedId) {
      toast.error("Failed to save calculation");
    } else {
      toast.success(`"${trimmed}" saved successfully!`);
      onSaved?.(savedId, trimmed);
      setSaveName("");
      setDuplicateCalc(null);
      onClose();
    }
  };

  const handleSaveNew = () => {
    const trimmed = saveName.trim();
    if (!trimmed) {
      toast.error("Please enter a name for this calculation");
      return;
    }
    const existing = savedCalcs.find(
      (c) => c.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (existing) {
      setDuplicateCalc(existing);
      return;
    }
    performSave();
  };

  const handleLoad = (calc: SavedCalc) => {
    if (!onLoadCalculation) return;
    onLoadCalculation({
      id: calc.id,
      name: calc.name,
      loanAmount: calc.loan_amount,
      interestRate: calc.interest_rate,
      loanTenure: calc.loan_tenure,
      startMonth: calc.start_month,
      startYear: calc.start_year,
      partPayments: calc.part_payments || [],
      comparisonScenarios: calc.comparison_scenarios || [],
      scoringWeights: calc.scoring_weights || { ...DEFAULT_SCORING_WEIGHTS },
      affordabilityInputs: calc.affordability_inputs || {},
    });
    toast.success(`Loaded "${calc.name}"`);
    onClose();
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    const { error } = await supabase.from(DB_TABLES.SAVED_CALCULATIONS).delete().eq("id", id);
    setDeleting(null);
    if (error) {
      toast.error("Failed to delete");
    } else {
      setSavedCalcs((prev) => prev.filter((c) => c.id !== id));
      toast.success("Deleted successfully");
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/60 backdrop-blur-md" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg">
      <Card className="w-full max-w-lg bg-card border-border shadow-xl animate-fade-in max-h-[80vh] flex flex-col">
        <CardHeader className="relative bg-gradient-to-r from-financial-primary to-financial-success text-primary-foreground rounded-t-lg py-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="absolute right-2 top-2 text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/20"
          >
            <X className="w-4 h-4" />
          </Button>
          <CardTitle className="text-xl flex items-center gap-2">
            {mode === "save-new" ? <Save className="w-5 h-5" /> : <FolderOpen className="w-5 h-5" />}
            {mode === "save-new" ? "Save as New Loan" : "My Saved Loans"}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 pb-4 overflow-y-auto flex-1">
          {mode === "save-new" ? (
            duplicateCalc ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                  <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-foreground">A loan named "{duplicateCalc.name}" already exists.</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Do you want to replace it with the current loan session, or go back and choose a different name?
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setDuplicateCalc(null)}
                    className="flex-1"
                    disabled={loading}
                  >
                    Go Back
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => performSave(duplicateCalc.id)}
                    className="flex-1"
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Replace
                  </Button>
                </div>
              </div>
            ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Name</label>
                <Input
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder="e.g., Home Loan 2026"
                  autoFocus
                />
              </div>
              <p className="text-xs text-muted-foreground">
                This will save your current loan details, part payments, comparison scenarios, scoring weights, and affordability inputs.
              </p>
              <Button onClick={handleSaveNew} className="w-full" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Save
              </Button>
            </div>
            )
          ) : (
            <div className="space-y-3">
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : savedCalcs.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">
                  No saved calculations yet. Save your current configuration to get started!
                </p>
              ) : (
                savedCalcs.map((calc) => (
                  <div
                    key={calc.id}
                    className="p-3 rounded-lg border border-border bg-muted/20 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <button
                        onClick={() => handleLoad(calc)}
                        className="flex-1 text-left"
                      >
                        <p className="text-sm font-medium text-foreground">{calc.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatCurrency(calc.loan_amount)} @ {calc.interest_rate}% for {calc.loan_tenure} yrs
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <Clock className="w-3 h-3" />
                          {new Date(calc.updated_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      </button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(calc.id)}
                        disabled={deleting === calc.id}
                      >
                        {deleting === calc.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </div>,
    document.body
  );
};
