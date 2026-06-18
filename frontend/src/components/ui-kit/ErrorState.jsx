import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ErrorState({ message, className }) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive",
        className,
      )}
    >
      <AlertCircle className="w-4 h-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
