import { useState } from 'react';
import { Wallet } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useWallet } from '@/hooks/useWallet';
import { AuthDialog } from '@/components/AuthDialog';
import { TopupDialog } from '@/components/wallet/TopupDialog';

interface WalletSectionProps {
  className?: string;
  iconClassName?: string;
  textClassName?: string;
}

export const WalletSection = ({ 
  className = '', 
  iconClassName = 'h-3.5 w-3.5',
  textClassName = 'text-sm'
}: WalletSectionProps) => {
  const { user } = useAuth();
  const { balance, loading: walletLoading } = useWallet();
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [showTopupDialog, setShowTopupDialog] = useState(false);

  const handleWalletClick = () => {
    if (!user) {
      setShowAuthDialog(true);
    } else {
      setShowTopupDialog(true);
    }
  };

  const handleAuthSuccess = () => {
    setShowAuthDialog(false);
    // After successful login, show topup dialog
    setShowTopupDialog(true);
  };

  return (
    <>
      <div 
        className={`flex items-center gap-1 text-primary font-medium cursor-pointer hover:text-primary/80 ${className}`}
        onClick={handleWalletClick}
      >
        <Wallet className={iconClassName} />
        <span className={textClassName}>
          {walletLoading ? '...' : `$${balance.toFixed(2)}`}
        </span>
      </div>

      <AuthDialog 
        open={showAuthDialog} 
        onOpenChange={setShowAuthDialog}
        onSuccess={handleAuthSuccess}
      />
      
      <TopupDialog 
        open={showTopupDialog} 
        onOpenChange={setShowTopupDialog}
      />
    </>
  );
};
