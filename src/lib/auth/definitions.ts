// Same roles as the customer app (customer/lib/auth/definitions.ts).
export const USER_ROLES = ["customer", "moderator", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

/** Roles allowed into the admin panel at all. */
export const STAFF_ROLES: UserRole[] = ["admin", "moderator"];

export function isStaffRole(role: unknown): role is "admin" | "moderator" {
  return STAFF_ROLES.includes(role as UserRole);
}
