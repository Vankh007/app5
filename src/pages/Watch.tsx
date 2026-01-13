import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

// This is a redirect component for the old /watch/:id route
// All watch functionality is now in WatchPage.tsx
const Watch = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to the new route format
    if (id) {
      navigate(`/watch/movie/${id}`, { replace: true });
    } else {
      navigate('/', { replace: true });
    }
  }, [id, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  );
};

export default Watch;
