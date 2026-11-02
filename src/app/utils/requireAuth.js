import { getSessionUser } from "@/app/lib/session";

/**
 * Verifies the session against the database. Pass `roles` to narrow access further,
 * e.g. requireAuth(req, { roles: ["admin"] }).
 * Returns { user } on success, or { error, status } to send back.
 */
export const requireAuth = async (req, { roles } = {}) => {
    try {
        const user = await getSessionUser(req);

        if (!user) return { error: "Unauthorized", status: 401 };
        if (roles && !roles.includes(user.role)) return { error: "Forbidden", status: 403 };

        return { user };
    } catch (error) {
        console.error("Auth error:", error);
        return { error: "Unauthorized", status: 401 };
    }
};
