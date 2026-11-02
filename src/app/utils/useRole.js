import { useAuth } from "@/app/services/AuthProvider";

const useRole = () => {
    const { user, loading } = useAuth();
    return { role: user?.role || null, loading };
};

export default useRole;
