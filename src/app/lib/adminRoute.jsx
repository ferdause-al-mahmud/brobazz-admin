"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CircularProgress } from "@mui/material";
import { useAuth } from "@/app/services/AuthProvider";

const withAuth = (WrappedComponent) => {
  const WithAuthComponent = (props) => {
    const [isAuthorized, setIsAuthorized] = useState(false);
    const router = useRouter();
    const { user, loading } = useAuth();

    useEffect(() => {
      if (loading) return;

      if (!user) {
        router.replace("/login");
        return;
      }

      if (user.role !== "admin" && user.role !== "moderator") {
        router.replace("/unauthorized");
        return;
      }

      setIsAuthorized(true);
    }, [loading, router, user]);

    if (loading) {
      return (
        <div className="flex justify-center items-center h-[100vh] w-full">
          <CircularProgress className="text-black" />
        </div>
      );
    }

    return isAuthorized ? <WrappedComponent {...props} /> : null;
  };

  WithAuthComponent.displayName = `WithAuth(${
    WrappedComponent.displayName || WrappedComponent.name || "Component"
  })`;

  return WithAuthComponent;
};

export default withAuth;
