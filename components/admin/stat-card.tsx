"use client";

import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  description?: string;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  color,
  description,
}: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-9 h-9 sm:w-10 sm:h-10 shrink-0 rounded-lg bg-muted flex items-center justify-center">
            <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${color}`} />
          </div>
          <div className="min-w-0">
            <div className="text-xl sm:text-2xl font-bold truncate">{value}</div>
            <div className="text-xs sm:text-sm text-muted-foreground truncate">
              {label}
            </div>
            {description && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {description}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}