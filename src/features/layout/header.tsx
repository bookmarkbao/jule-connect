import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

export function SiteHeader({
  title,
  onRefresh,
  refreshDisabled,
}: {
  title: string;
  onRefresh: () => void;
  refreshDisabled: boolean;
}) {
  return (
    <header className="flex h-[var(--header-height)] items-center justify-between gap-2 border-b bg-background px-4">
      <div className="text-sm font-semibold">{title}</div>
      <Button onClick={onRefresh} variant="secondary" size="sm" disabled={refreshDisabled}>
        <RefreshCw className="h-4 w-4" />
        Refresh
      </Button>
    </header>
  );
}

