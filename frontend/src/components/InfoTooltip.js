import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HelpCircle } from 'lucide-react';

const InfoTooltip = ({ text, children }) => {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          {children || (
            <HelpCircle className="w-4 h-4 text-slate-400 hover:text-violet-400 cursor-help inline-block ml-1" />
          )}
        </TooltipTrigger>
        <TooltipContent className="max-w-xs bg-slate-800 border-slate-700 text-slate-100 p-3">
          <p className="text-sm">{text}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default InfoTooltip;
