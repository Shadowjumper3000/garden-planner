import { useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationAPI } from "@/api";
import NotificationList from "./NotificationList";

const NotificationBell = () => {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  // Poll for unread count every 30 seconds
  const { data: unread = [] } = useQuery({
    queryKey: ["notifications", "unread"],
    queryFn: () => notificationAPI.getAll(true),
    refetchInterval: 30_000,
  });

  const unreadCount = unread.length;

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      // Refresh full list when panel opens
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-white hover:bg-white/10"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white leading-none">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[340px] p-0 max-h-[480px] flex flex-col"
      >
        <NotificationList onClose={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
