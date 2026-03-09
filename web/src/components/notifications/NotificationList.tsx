import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationAPI } from "@/api";
import { Notification } from "@/types";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Bell, CheckCheck, Droplets, Scissors, Trash2, X } from "lucide-react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

interface NotificationListProps {
  onClose?: () => void;
  /** When true renders a full-page list without the popover chrome */
  fullPage?: boolean;
}

const typeIcon = (type: string) => {
  switch (type) {
    case "watering":
      return <Droplets className="h-4 w-4 text-blue-500 shrink-0" />;
    case "harvest":
      return <Scissors className="h-4 w-4 text-orange-500 shrink-0" />;
    default:
      return <Bell className="h-4 w-4 text-garden-primary shrink-0" />;
  }
};

const NotificationList = ({ onClose, fullPage = false }: NotificationListProps) => {
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ["notifications", "all"],
    queryFn: () => notificationAPI.getAll(false),
    refetchInterval: fullPage ? 30_000 : undefined,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => notificationAPI.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAll = useMutation({
    mutationFn: () => notificationAPI.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => notificationAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4" />
          <span className="font-semibold text-sm">Notifications</span>
          {unreadCount > 0 && (
            <span className="text-xs bg-red-100 text-red-700 rounded-full px-1.5">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="icon"
              title="Mark all read"
              onClick={() => markAll.mutate()}
              className="h-7 w-7"
            >
              <CheckCheck className="h-4 w-4" />
            </Button>
          )}
          {!fullPage && (
            <>
              <Button variant="ghost" size="icon" asChild className="h-7 w-7">
                <Link to="/notifications" onClick={onClose}>
                  <Bell className="h-4 w-4" />
                </Link>
              </Button>
              {onClose && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="h-7 w-7"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* List */}
      <ScrollArea className={fullPage ? "flex-1" : "max-h-[380px]"}>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-garden-primary" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground text-sm">
            <Bell className="h-8 w-8 opacity-30" />
            <p>No notifications yet</p>
          </div>
        ) : (
          <div>
            {notifications.map((n, idx) => (
              <div key={n.id}>
                <div
                  className={`flex items-start gap-3 px-4 py-3 hover:bg-muted/40 transition-colors ${
                    !n.isRead ? "bg-blue-50/60" : ""
                  }`}
                >
                  <div className="mt-0.5">{typeIcon(n.type)}</div>
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => {
                      if (!n.isRead) markRead.mutate(n.id);
                    }}
                  >
                    <p
                      className={`text-sm leading-snug ${
                        !n.isRead ? "font-medium" : "text-muted-foreground"
                      }`}
                    >
                      {n.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDistanceToNow(new Date(n.scheduledFor), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      remove.mutate(n.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </div>
                {idx < notifications.length - 1 && <Separator />}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default NotificationList;
