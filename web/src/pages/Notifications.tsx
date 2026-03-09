import Layout from "@/components/Layout";
import NotificationList from "@/components/notifications/NotificationList";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell } from "lucide-react";

const Notifications = () => {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <Bell className="h-7 w-7 text-garden-primary" />
          <h1 className="text-3xl font-serif font-bold text-garden-primary">
            Notifications
          </h1>
        </div>

        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-base font-medium text-muted-foreground">
              Watering reminders, harvest alerts, and other garden activity
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 pt-2">
            <NotificationList fullPage />
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Notifications;
