import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle2, AlertCircle, Wallet, QrCode, Download, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import QRCode from 'react-qr-code';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';
import defaultLogo from '@/assets/khmerzoon.png';

interface KHQRPaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newBalance: number) => void;
}

export const KHQRPaymentDialog = ({ isOpen, onClose, onSuccess }: KHQRPaymentDialogProps) => {
  const { user } = useAuth();
  const { logos } = useSiteSettings();
  
  // Use logo from site settings, fallback to default
  const logo = logos?.dark_logo || logos?.light_logo || defaultLogo;
  const [amount, setAmount] = useState('10');
  const [loading, setLoading] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'pending' | 'completed' | 'failed'>('idle');

  // Check if user is logged in
  useEffect(() => {
    if (isOpen && !user) {
      toast.error('Please login to top up your wallet');
      onClose();
    }
  }, [isOpen, user, onClose]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (paymentStatus === 'pending' && transactionId) {
      interval = setInterval(() => {
        checkPaymentStatus();
      }, 3000); // Check every 3 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [paymentStatus, transactionId]);

  const generateQRCode = async () => {
    if (!user) {
      toast.error('Please login to continue');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Session expired. Please login again');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('khqr-payment', {
        body: {
          action: 'generate',
          amount: parseFloat(amount),
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (data.success) {
        setQrCode(data.qrCode);
        setTransactionId(data.transactionId);
        setExpiresAt(data.expiresAt);
        setPaymentStatus('pending');
        toast.success('QR Code generated! Scan to pay');
      } else {
        throw new Error('Failed to generate QR code');
      }
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast.error('Failed to generate QR code');
    } finally {
      setLoading(false);
    }
  };

  const checkPaymentStatus = async () => {
    if (!transactionId || checking || !user) return;

    setChecking(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.error('No active session for payment check');
        setChecking(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('khqr-payment', {
        body: {
          action: 'check',
          transactionId,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('Payment check error:', error);
        setChecking(false);
        return;
      }

      if (data.status === 'completed') {
        setPaymentStatus('completed');
        toast.success(`Payment successful! Balance: $${data.newBalance.toFixed(2)}`);
        onSuccess?.(data.newBalance);
        setTimeout(() => {
          handleClose();
        }, 2000);
      } else if (data.error) {
        console.warn('Bakong API issue:', data.error);
      }
    } catch (error) {
      console.error('Error checking payment:', error);
    } finally {
      setChecking(false);
    }
  };

  const manualCheckPayment = async () => {
    if (!transactionId || !user) return;

    setChecking(true);
    toast.info('Checking payment status...');
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Session expired. Please login again');
        setChecking(false);
        return;
      }

      // Check directly in database for webhook updates
      const { data: transaction, error: txError } = await supabase
        .from('payment_transactions')
        .select('status, amount')
        .eq('id', transactionId)
        .eq('user_id', user.id)
        .single();

      if (txError) {
        console.error('Error fetching transaction:', txError);
        toast.error('Failed to check payment status');
        setChecking(false);
        return;
      }

      if (transaction.status === 'completed') {
        // Get updated balance
        const { data: profile } = await supabase
          .from('profiles')
          .select('wallet_balance')
          .eq('id', user.id)
          .single();

        const newBalance = profile?.wallet_balance || 0;
        
        setPaymentStatus('completed');
        toast.success(`Payment confirmed! Balance: $${newBalance.toFixed(2)}`);
        onSuccess?.(newBalance);
        setTimeout(() => {
          handleClose();
        }, 2000);
      } else {
        toast.info('Payment not confirmed yet. Please wait or contact support if you have paid.');
      }
    } catch (error) {
      console.error('Error in manual check:', error);
      toast.error('Failed to verify payment');
    } finally {
      setChecking(false);
    }
  };

  const handleClose = () => {
    setAmount('10');
    setQrCode(null);
    setTransactionId(null);
    setExpiresAt(null);
    setPaymentStatus('idle');
    onClose();
  };

  // Generate watermarked KHQR image matching reference design
  const generateWatermarkedQRImage = async (): Promise<Blob | null> => {
    const qrSvg = document.getElementById('qr-code-svg');
    if (!qrSvg) return null;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Canvas size for the watermarked image
    const width = 400;
    const height = 520;
    canvas.width = width;
    canvas.height = height;

    // Fill white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Load and draw logo
    const logoImg = new Image();
    logoImg.crossOrigin = 'anonymous';
    logoImg.src = logo;
    
    await new Promise((resolve) => {
      logoImg.onload = resolve;
      logoImg.onerror = resolve;
    });

    // Draw logo (centered at top) - small size
    const logoSize = 40;
    ctx.drawImage(logoImg, (width - logoSize) / 2, 20, logoSize, logoSize);

    // Draw app name "KHMERZOON" below logo
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('KHMERZOON', width / 2, 80);

    // Convert QR SVG to image
    const svgData = new XMLSerializer().serializeToString(qrSvg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    
    const qrImg = new Image();
    qrImg.crossOrigin = 'anonymous';
    
    await new Promise((resolve, reject) => {
      qrImg.onload = resolve;
      qrImg.onerror = reject;
      qrImg.src = url;
    });

    // Draw QR code (centered)
    const qrSize = 260;
    const qrX = (width - qrSize) / 2;
    const qrY = 100;
    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
    URL.revokeObjectURL(url);

    // Draw logo centered inside QR code with white background circle
    const centerLogoSize = 50;
    const centerX = qrX + (qrSize - centerLogoSize) / 2;
    const centerY = qrY + (qrSize - centerLogoSize) / 2;
    
    // Draw white circle background for logo
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(qrX + qrSize / 2, qrY + qrSize / 2, centerLogoSize / 2 + 5, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw the logo in the center
    ctx.drawImage(logoImg, centerX, centerY, centerLogoSize, centerLogoSize);

    // Draw "Scan to Pay $XX.XX" text
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`Scan to Pay $${parseFloat(amount).toFixed(2)}`, width / 2, qrY + qrSize + 35);

    // Draw "Open in Banking App" text
    ctx.fillStyle = '#666666';
    ctx.font = '14px Arial';
    ctx.fillText('Open in Banking App', width / 2, qrY + qrSize + 60);

    // Draw "Powered by KHQR" watermark at bottom
    ctx.fillStyle = '#999999';
    ctx.font = '12px Arial';
    ctx.fillText('Powered by KHQR', width / 2, height - 15);

    // Convert to blob
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/png', 1.0);
    });
  };

  const downloadQRCode = async () => {
    if (!qrCode) return;

    try {
      const blob = await generateWatermarkedQRImage();
      
      if (!blob) {
        toast.error('Failed to generate QR image');
        return;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `KHMERZOON-KHQR-${Date.now()}.png`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('QR Code downloaded successfully');
    } catch (error) {
      console.error('Error downloading QR code:', error);
      toast.error('Failed to download QR code');
    }
  };

  const shareToBank = async () => {
    if (!qrCode) return;

    try {
      const blob = await generateWatermarkedQRImage();

      if (!blob) {
        toast.error('Failed to create QR image');
        return;
      }

      // Try Web Share API for native sharing
      const navAny = navigator as any;
      if (navAny?.share) {
        try {
          const file = new File([blob], 'KHMERZOON-KHQR-Payment.png', { type: 'image/png' });
          
          // Check if we can share files
          if (navAny.canShare && !navAny.canShare({ files: [file] })) {
            throw new Error('File sharing not supported');
          }

          await navAny.share({
            files: [file],
            title: 'KHMERZOON KHQR Payment',
            text: `Scan to pay $${parseFloat(amount).toFixed(2)} - Open in your banking app`,
          });
          
          toast.success('QR code shared successfully');
          return;
        } catch (shareError: any) {
          console.log('Share API error:', shareError);
          
          // If user cancelled, don't show error
          if (shareError.name === 'AbortError') {
            return;
          }
          
          // Fallback: download instead
          const downloadUrl = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = downloadUrl;
          link.download = `KHMERZOON-KHQR-${Date.now()}.png`;
          link.click();
          URL.revokeObjectURL(downloadUrl);
          toast.success('QR code downloaded - Open in your banking app');
          return;
        }
      }

      // If share API not available, download automatically
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `KHMERZOON-KHQR-${Date.now()}.png`;
      link.click();
      URL.revokeObjectURL(downloadUrl);
      toast.success('QR code downloaded - Open in your banking app');
      
    } catch (error) {
      console.error('Error sharing:', error);
      toast.error('Please use the Download button instead');
    }
  };

  const quickAmounts = [5, 10, 20, 50, 100];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] bg-gradient-to-br from-background via-background to-primary/5">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <img src={logo} alt="KHMERZOON" className="w-12 h-12 object-contain" />
            <div>
              <DialogTitle className="text-2xl font-bold">KHMERZOON</DialogTitle>
              <DialogDescription>Top Up Wallet using KHQR Payment</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {paymentStatus === 'idle' && (
            <>
              <div className="space-y-3">
                <label className="text-sm font-medium">Enter Amount (USD)</label>
                <Input
                  type="number"
                  placeholder="Enter amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min="1"
                  step="0.01"
                  className="text-lg h-12"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Quick Select</label>
                <div className="grid grid-cols-5 gap-2">
                  {quickAmounts.map((quickAmount) => (
                    <Button
                      key={quickAmount}
                      variant={amount === quickAmount.toString() ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setAmount(quickAmount.toString())}
                      className="font-semibold"
                    >
                      ${quickAmount}
                    </Button>
                  ))}
                </div>
              </div>

              <Button
                onClick={generateQRCode}
                disabled={loading || !amount || parseFloat(amount) <= 0}
                className="w-full h-12 text-lg font-semibold"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Generating QR Code...
                  </>
                ) : (
                  <>
                    <QrCode className="w-5 h-5 mr-2" />
                    Generate KHQR Payment
                  </>
                )}
              </Button>
            </>
          )}

          {paymentStatus === 'pending' && qrCode && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex flex-col items-center justify-center p-6 bg-white rounded-lg shadow-lg animate-scale-in">
                <QRCode id="qr-code-svg" value={qrCode} size={250} />
              </div>

              <div className="text-center space-y-2">
                <p className="text-lg font-semibold">Scan to Pay ${parseFloat(amount).toFixed(2)}</p>
                {expiresAt && (
                  <p className="text-xs text-muted-foreground">
                    Expires at {new Date(expiresAt).toLocaleTimeString()}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="default"
                  onClick={shareToBank}
                  className="w-full"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Open With
                </Button>
                <Button
                  variant="secondary"
                  onClick={downloadQRCode}
                  className="w-full"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>

              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <div className="h-2 w-2 bg-orange-500 rounded-full animate-pulse" />
                Waiting for payment confirmation
              </div>

              <Button
                variant="default"
                onClick={manualCheckPayment}
                disabled={checking}
                className="w-full"
              >
                {checking ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    I Have Paid - Check Status
                  </>
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Already paid? Click the button above to verify your payment
              </p>

              <Button
                variant="outline"
                onClick={handleClose}
                className="w-full"
              >
                Cancel
              </Button>
            </div>
          )}

          {paymentStatus === 'completed' && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className="p-4 rounded-full bg-green-500/10">
                <CheckCircle2 className="w-16 h-16 text-green-500" />
              </div>
              <div className="text-center space-y-1">
                <h3 className="text-2xl font-bold text-green-500">Payment Successful!</h3>
                <p className="text-muted-foreground">
                  ${parseFloat(amount).toFixed(2)} has been added to your wallet
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
