import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Calendar, Users, Clock, BarChart3 } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-3xl mx-auto">
          <div className="flex justify-center mb-6">
            <div className="flex items-center gap-3 text-primary">
              <Calendar className="h-12 w-12" />
              <span className="text-4xl font-bold">Workforce Manager</span>
            </div>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            24/7 Call Center Scheduling Made Simple
          </h1>

          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
            Powerful drag-and-drop scheduling for technical support teams.
            Manage shifts, breaks, training, and more with ease.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/login">
              <Button size="lg" className="w-full sm:w-auto">
                Sign In
              </Button>
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="mt-20 grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          <FeatureCard
            icon={Calendar}
            title="Visual Scheduling"
            description="Drag and drop interface for intuitive schedule management"
          />
          <FeatureCard
            icon={Users}
            title="Agent Management"
            description="Easily manage your team of technical support agents"
          />
          <FeatureCard
            icon={Clock}
            title="30-Minute Intervals"
            description="Precise scheduling with half-hour time slots"
          />
          <FeatureCard
            icon={BarChart3}
            title="Staffing Coverage"
            description="Real-time visibility into staffing levels and requirements"
          />
        </div>
      </div>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border">
      <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-lg mb-4">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-gray-600 dark:text-gray-400 text-sm">{description}</p>
    </div>
  );
}
