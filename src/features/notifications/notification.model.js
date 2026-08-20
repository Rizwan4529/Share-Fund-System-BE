import { ENUMS } from "#/utils/constants";
import mongoose from "mongoose";

const { Schema, model } = mongoose;

const notificationSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User id is required"],
    },
    notificationType: {
      type: String,
      enum: Object.values(ENUMS.NOTIFICATION_TYPE),
      required: [true, "Notification Type is required"],
    },
    title: {
      type: String,
      trim: true,
      required: [true, "Title is required"],
    },
    body: {
      type: String,
      trim: true,
      required: [true, "Body is required"],
    },
    isRead: {
      type: Boolean,
      required: [true, "Is Read is required"],
      default: false,
    },
  },
  { timestamps: true },
);

const Notification = model("Notification", notificationSchema);
export default Notification;
