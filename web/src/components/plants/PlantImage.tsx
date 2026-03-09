import React from "react";
import { Sprout } from "lucide-react";

interface PlantImageProps {
  /** URL of the plant image */
  imageUrl?: string;
  name: string;
  /** Additional class names for the container */
  className?: string;
  /** Size class applied to the fallback Sprout icon, e.g. "h-5 w-5" */
  iconSize?: string;
}

/**
 * Displays a plant image if available, otherwise shows a Sprout icon fallback.
 * Intended for use inside a sized container (e.g. a rounded-full div).
 */
const PlantImage: React.FC<PlantImageProps> = ({
  imageUrl,
  name,
  className = "w-full h-full",
  iconSize = "h-5 w-5",
}) => {
  const [imgError, setImgError] = React.useState(false);

  if (imageUrl && !imgError) {
    return (
      <img
        src={imageUrl}
        alt={name}
        className={`${className} object-cover`}
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div className={`${className} flex items-center justify-center`}>
      <Sprout className={`${iconSize} text-garden-secondary`} />
    </div>
  );
};

export default PlantImage;
