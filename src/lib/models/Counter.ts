import "server-only";
import { model, models, Schema } from "mongoose";

// Named sequences, e.g. { _id: "orderID", seq: 42 }. Incremented atomically.
const counterSchema = new Schema({
  _id: { type: String, required: true },
  seq: { type: Number, required: true, default: 0 },
});

const createCounterModel = () => model("Counter", counterSchema);

export const Counter =
  (models.Counter as ReturnType<typeof createCounterModel> | undefined) ?? createCounterModel();
