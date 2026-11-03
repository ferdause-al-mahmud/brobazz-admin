import "server-only";
import { model, models, Schema, type InferSchemaType } from "mongoose";
import { USER_ROLES } from "@/lib/auth/definitions";

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // Required by the register form; Google sign-ups don't provide one. Sparse so many users can omit it.
    phone: { type: String, unique: true, sparse: true, trim: true },
    // bcrypt hash; absent for Google-only accounts. Excluded from queries unless selected with "+password".
    password: { type: String, select: false },
    googleId: { type: String, unique: true, sparse: true },
    avatar: { type: String },
    role: { type: String, enum: USER_ROLES, default: "customer", required: true },
  },
  { timestamps: true },
);

export type UserDocument = InferSchemaType<typeof userSchema>;

const createUserModel = () => model("User", userSchema);

// Reuse the compiled model across hot reloads instead of redefining it.
export const User =
  (models.User as ReturnType<typeof createUserModel> | undefined) ?? createUserModel();
