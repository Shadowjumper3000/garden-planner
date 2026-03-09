import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Garden } from "@/types";
import { Folder } from "lucide-react";

interface GardenCardProps {
  garden: Garden;
}

const GardenCard = ({ garden }: GardenCardProps) => (
  <Link to={`/gardens/${garden.id}`}>
    <Card className="h-full transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-serif text-garden-primary">{garden.name}</CardTitle>
          <div className="w-10 h-10 bg-garden-secondary/10 rounded-full flex items-center justify-center">
            <Folder className="h-5 w-5 text-garden-secondary" />
          </div>
        </div>
        <CardDescription>
          {garden.widthM} m × {garden.heightM} m
        </CardDescription>
      </CardHeader>

      <CardContent className="pb-2">
        <div className="w-full h-32 rounded overflow-hidden border relative bg-amber-50">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-garden-primary/20"
              style={{
                left: `${10 + (i * 11) % 80}%`,
                top: `${15 + (i * 17) % 65}%`,
                width: `${8 + (i * 7) % 12}%`,
                height: `${8 + (i * 5) % 12}%`,
              }}
            />
          ))}
        </div>
      </CardContent>

      <CardFooter className="pt-2">
        <p className="text-sm text-muted-foreground">
          Created {new Date(garden.createdAt).toLocaleDateString()}
        </p>
      </CardFooter>
    </Card>
  </Link>
);

export default GardenCard;
