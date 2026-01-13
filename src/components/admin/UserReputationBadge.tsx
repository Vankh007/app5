import { Award, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface UserReputationBadgeProps {
  score: number;
  size?: "sm" | "md" | "lg";
}

export function UserReputationBadge({ score, size = "md" }: UserReputationBadgeProps) {
  const getBadgeConfig = (score: number) => {
    if (score >= 500) return { 
      label: "Gold", 
      color: "bg-yellow-500 text-white hover:bg-yellow-600", 
      icon: Award,
      description: "Excellent reporter - highly trusted"
    };
    if (score >= 300) return { 
      label: "Silver", 
      color: "bg-gray-400 text-white hover:bg-gray-500", 
      icon: Award,
      description: "Great reporter - trusted"
    };
    if (score >= 150) return { 
      label: "Bronze", 
      color: "bg-orange-600 text-white hover:bg-orange-700", 
      icon: Award,
      description: "Good reporter - reliable"
    };
    if (score < 50) return { 
      label: "Low", 
      color: "bg-red-500 text-white hover:bg-red-600", 
      icon: Shield,
      description: "Low reputation - may be restricted"
    };
    return { 
      label: "Basic", 
      color: "bg-gray-500 text-white hover:bg-gray-600", 
      icon: Shield,
      description: "New or average reporter"
    };
  };

  const config = getBadgeConfig(score);
  const BadgeIcon = config.icon;
  
  const iconSize = size === "sm" ? "h-3 w-3" : size === "lg" ? "h-5 w-5" : "h-4 w-4";
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Badge className={config.color}>
            <BadgeIcon className={`${iconSize} mr-1`} />
            {config.label}
            <span className="ml-1 opacity-80">({score})</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{config.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
