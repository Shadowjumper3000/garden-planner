import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
  {
    title: "Garden Planning",
    description:
      "Design your garden layout with our interactive grid system. Arrange plants optimally based on space and sunlight needs.",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-garden-primary"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18" />
        <path d="M9 21V9" />
      </svg>
    ),
  },
  {
    title: "Soil Management",
    description:
      "Track and monitor soil nutrient levels. Get alerts when soil needs amendments and view historical soil health data.",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-garden-primary"
      >
        <path d="M2 22c1.25-1 2.5-1 5-1 2 0 3 1 5 1s3-1 5-1c2.5 0 3.75 0 5 1" />
        <path d="M2 17c1.25-1 2.5-1 5-1 2 0 3 1 5 1s3-1 5-1c2.5 0 3.75 0 5 1" />
        <path d="M2 12c1.25-1 2.5-1 5-1 2 0 3 1 5 1s3-1 5-1c2.5 0 3.75 0 5 1" />
        <path d="M15 5V2" />
        <path d="M18 8V5" />
        <path d="M15 11V8" />
      </svg>
    ),
  },
  {
    title: "Plant Library",
    description:
      "Access a comprehensive database of plants with growing information, companion planting suggestions, and seasonal planting guides.",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-garden-primary"
      >
        <path d="M12 2L3 9h4v11h10V9h4z" />
        <path d="M12 3v10" />
        <path d="M6 13h12" />
        <path d="M10 17v-4" />
        <path d="M14 17v-4" />
      </svg>
    ),
  },
];

const FeaturesSection = () => (
  <div className="max-w-4xl mx-auto">
    <h2 className="text-2xl font-serif font-semibold text-garden-primary mb-6">Features</h2>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {features.map((feature) => (
        <Card key={feature.title}>
          <CardHeader>
            <div className="w-12 h-12 bg-garden-primary/10 rounded-full flex items-center justify-center mb-4">
              {feature.icon}
            </div>
            <CardTitle className="font-serif text-garden-primary">{feature.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{feature.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);

export default FeaturesSection;
