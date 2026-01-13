import { Crown, Key, CreditCard } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PricingPreviewProps {
  accessType: string;
  price: number;
  currency: string;
  rentalPeriod: number;
  excludeFromPlan: boolean;
  backdropUrl?: string;
}

export const PricingPreview = ({
  accessType,
  price,
  currency,
  rentalPeriod,
  excludeFromPlan,
  backdropUrl
}: PricingPreviewProps) => {
  const isPurchase = accessType?.toLowerCase() === 'purchase';
  const isMembership = accessType?.toLowerCase() === 'membership';
  const isFree = accessType?.toLowerCase() === 'free';

  if (isFree) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-green-500"></span>
            User Preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            This content is <span className="font-semibold text-green-600">FREE</span> - Users can watch immediately without any payment or subscription.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-orange-500 animate-pulse"></span>
          User Preview - Lock Screen
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div 
          className="relative w-full h-[300px] flex flex-col items-center justify-center bg-black/90 overflow-hidden rounded-b-lg"
          style={{
            backgroundImage: backdropUrl ? `url(${backdropUrl})` : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        >
          {/* Dark overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/85 to-black/70" />

          {/* Content */}
          <div className="relative z-10 text-center w-full space-y-4 px-5 max-w-md scale-[0.85]">
            {/* Title and Badge */}
            <div className="space-y-2">
              <div className="flex justify-center">
                <Badge 
                  variant="outline" 
                  className={`backdrop-blur-md font-semibold ${
                    isPurchase
                      ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-500'
                      : 'bg-red-500/20 border-red-500/50 text-red-500'
                  } px-3 py-0.5 text-xs`}
                >
                  {isPurchase ? (
                    <>
                      <Key className="mr-1 h-4 w-4" />
                      For Rent
                    </>
                  ) : (
                    <>
                      <Crown className="mr-1 h-4 w-4" />
                      Premium Content
                    </>
                  )}
                </Badge>
              </div>
              
              <h2 className="font-bold text-white text-2xl">
                {isPurchase ? 'Rent Content' : 'Premium Membership Required'}
              </h2>
              
              <p className="text-gray-300 max-w-sm mx-auto text-base">
                {isPurchase && excludeFromPlan
                  ? 'Purchase to watch now!'
                  : isPurchase && !excludeFromPlan
                    ? 'This content requires a purchase or premium subscription'
                    : 'Purchase to watch now!'
                }
              </p>
            </div>

            {/* Action Buttons */}
            <div className="pt-1">
              {/* Case 1: Purchase with exclude_from_plan = true */}
              {isPurchase && excludeFromPlan && (
                <Button 
                  size="default"
                  className="w-full font-semibold bg-red-500 hover:bg-red-600 text-white text-base h-12 pointer-events-none"
                >
                  <CreditCard className="mr-1.5 h-4 w-4" />
                  Purchase {currency === 'USD' ? '$' : currency}{price} ({rentalPeriod}d)
                </Button>
              )}

              {/* Case 2: Purchase with exclude_from_plan = false */}
              {isPurchase && !excludeFromPlan && (
                <div className="flex gap-1.5 w-full">
                  <Button 
                    size="default"
                    className="flex-1 font-semibold bg-red-500 hover:bg-red-600 text-white text-sm h-12 pointer-events-none"
                  >
                    <CreditCard className="mr-1 h-3.5 w-3.5" />
                    Purchase {currency === 'USD' ? '$' : currency}{price} ({rentalPeriod}d)
                  </Button>
                  <Button 
                    size="default"
                    className="flex-1 font-semibold bg-[hsl(var(--watching))] hover:bg-[hsl(var(--watching))]/90 text-black text-sm h-12 pointer-events-none"
                  >
                    <Crown className="mr-1 h-3.5 w-3.5" />
                    View Subscription Plans
                  </Button>
                </div>
              )}

              {/* Case 3: Membership version */}
              {isMembership && (
                <Button 
                  size="default"
                  className="w-full font-semibold bg-[hsl(var(--watching))] hover:bg-[hsl(var(--watching))]/90 text-black text-base h-12 pointer-events-none"
                >
                  <Crown className="mr-1.5 h-4 w-4" />
                  Join Membership
                </Button>
              )}
            </div>

            {/* Footer text */}
            <p className="text-gray-400 text-xs pt-2">
              Or subscribe to Premium for unlimited access
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
