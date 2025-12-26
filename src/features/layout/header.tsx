import { RefreshCw } from "lucide-react";
import { ClipLoader } from "react-spinners";

import { Button } from "@/components/ui/button";
import { SidebarInput, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

export function SiteHeader({
  title,
  onRefresh,
  refreshDisabled,
  isRefreshing,
  searchText,
  onSearchTextChange,
}: {
  title: string;
  onRefresh: () => void;
  refreshDisabled: boolean;
  isRefreshing: boolean;
  searchText: string;
  onSearchTextChange: (value: string) => void;
}) {
  return (
    <header className="flex h-[var(--header-height)] items-center gap-2 border-b bg-background px-4">
       <SidebarTrigger className="-ml-1" />
       <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
      <div className="w-[320px]">
        <SidebarInput
          value={searchText}
          onChange={(e) => onSearchTextChange(e.target.value)}
          placeholder="Search ports, processes..."
        />
      </div>
      <Button onClick={onRefresh} variant="secondary" size="sm" disabled={refreshDisabled}>
        {isRefreshing ? (
          <ClipLoader size={16} color="currentColor" />
        ) : (
          <RefreshCw className="h-4 w-4" />
        )}
      </Button>
    </header>
  );
}
