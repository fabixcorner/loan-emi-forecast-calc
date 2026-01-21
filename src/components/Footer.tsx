import { useState } from "react";
import { createPortal } from "react-dom";
import { X, AlertTriangle, Shield, FileText, Mail, Copyright } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FooterItem {
  id: string;
  label: string;
  icon: any;
  title: string;
  content: string;
  isLink?: boolean;
  href?: string;
}

const footerItems: FooterItem[] = [
  {
    id: "disclaimer",
    label: "Disclaimer",
    icon: AlertTriangle,
    title: "Disclaimer",
    content: "Results are estimates only and do not constitute financial advice. Please confirm details with your bank or advisor. No responsibility is taken for errors or decisions made based on this tool.",
  },
  {
    id: "privacy",
    label: "Privacy Policy",
    icon: Shield,
    title: "Privacy Policy",
    content: "This loan calculator does not collect, store, or sell any personal information; all values you enter are processed in your browser solely to display estimated results and are not saved to any server. Basic, privacy‑friendly visit statistics may be used only to monitor site performance and are never used to personally identify you or shared with third parties for marketing. By using this tool, you agree that results are for informational purposes only and you should verify all figures with your lender or financial advisor.",
  },
  {
    id: "terms",
    label: "Terms of Use",
    icon: FileText,
    title: "Terms of Use",
    content: "By using this loan calculator, you agree that all results are estimates for informational purposes only and do not constitute financial, legal, or tax advice. The site owner is not liable for any errors, omissions, or decisions made based on the calculator's output, and you should always verify details directly with your lender or qualified advisor before acting. Your continued use of this tool indicates your acceptance of these terms and any future updates to them.",
  },
  {
    id: "contact",
    label: "Contact",
    icon: Mail,
    title: "Contact Us",
    content: "support@fabixsolutions.com",
    isLink: true,
    href: "mailto:support@fabixsolutions.com",
  },
];

export const Footer = () => {
  const [openItem, setOpenItem] = useState<FooterItem | null>(null);

  const handleClose = () => {
    setOpenItem(null);
  };

  return (
    <>
      <footer className="bg-card/60 backdrop-blur-sm border-t border-border mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
            {footerItems.map((item, index) => (
              <span key={item.id} className="flex items-center">
                <button
                  onClick={() => setOpenItem(item)}
                  className="hover:text-financial-primary hover:underline transition-colors cursor-pointer"
                >
                  {item.label}
                </button>
                {index < footerItems.length - 1 && (
                  <span className="ml-4 text-border">|</span>
                )}
              </span>
            ))}
            <span className="flex items-center">
              <span className="ml-4 text-border">|</span>
              <span className="ml-4 flex items-center gap-1">
                <Copyright className="h-3 w-3" />
                2026 Fabix Solutions. All rights reserved.
              </span>
            </span>
          </div>
        </div>
      </footer>

      {/* Modal Portal */}
      {openItem && createPortal(
        <>
          {/* Backdrop */}
          <div 
            className="dark fixed inset-0 bg-black/80 backdrop-blur-md z-[9999] animate-in fade-in"
            onClick={handleClose}
            style={{ pointerEvents: 'auto' }}
          />
          
          {/* Modal Card */}
          <div className="dark fixed left-0 right-0 top-1/4 z-[10000] flex justify-center px-4" style={{ pointerEvents: 'none' }}>
            <div 
              className="relative max-w-lg w-full glass-card p-6 animate-in slide-in-from-top fade-in duration-300"
              style={{ pointerEvents: 'auto' }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-financial-primary to-financial-success">
                    <openItem.icon className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white">{openItem.title}</h3>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClose}
                  className="text-white hover:bg-white/10"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              
              <div className="p-4 rounded-lg bg-white/5 border border-financial-border">
                {openItem.isLink ? (
                  <a 
                    href={openItem.href}
                    className="text-sm text-financial-primary hover:underline"
                  >
                    {openItem.content}
                  </a>
                ) : (
                  <p className="text-sm text-white/80 leading-relaxed">
                    {openItem.content}
                  </p>
                )}
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );
};
