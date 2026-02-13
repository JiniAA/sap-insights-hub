import { Loader2 } from "lucide-react";

export default function Spinner({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <Loader2 size={32} className="animate-spin text-primary" />
      <span className="text-sm text-muted-foreground">{text}</span>
    </div>
  );
}
