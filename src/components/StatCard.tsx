import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: string; positive: boolean };
  className?: string;
}

export default function StatCard({ title, value, subtitle, icon: Icon, trend, className }: StatCardProps) {
  return (
    <div className={cn("stat-card flex items-start justify-between", className)}>
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
        <p className="text-2xl font-bold mt-1 text-foreground">{value}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        {trend && (
          <p className={cn("text-xs font-medium mt-1", trend.positive ? "text-success" : "text-destructive")}>
            {trend.value}
          </p>
        )}
      </div>
      <div className="p-2.5 rounded-lg bg-primary/10">
        <Icon size={20} className="text-primary" />
      </div>
    </div>
  );
}
