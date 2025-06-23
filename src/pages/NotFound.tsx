import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center transform-gpu">
      <div className="w-full max-w-md space-y-8 text-center">
        <h1 className="text-9xl font-bold text-primary/30">404</h1>
        <div className="space-y-4">
          <h2 className="text-3xl font-extrabold">Page not found</h2>
          <p className="text-muted-foreground">
            Sorry, we couldn't find the page you're looking for.
          </p>
          <Button 
            onClick={() => navigate(-1)}
            className="inline-flex items-center transform-gpu"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go back
          </Button>
        </div>
      </div>
    </div>
  );
}