import mongoose from "mongoose";
import { ENUMS } from "#/utils/constants";
import bcrypt from "bcrypt";
const { Schema, model } = mongoose;

const userSchema = new Schema(
  {
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
      maxLength: [40, "First name must be less than 40 characters"],
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
      maxLength: [40, "Last name must be less than 40 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: (value) => /^\S+@\S+\.\S+$/.test(value),
        message: "Invalid email address",
      },
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minLength: [8, "Password must be at least 8 characters long"],
      select: false,
      validate: {
        validator: (value) =>
          /[A-Z]/.test(value) &&
          /[0-9]/.test(value) &&
          /[!@#$%^&*(),.?":{}|<>]/.test(value),
        message:
          "Password must contain at least one uppercase letter, one number, and one special character",
      },
    },
    role: {
      type: String,
      // required: [true, "Role is required"],
      enum: [ENUMS.ROLES.ADMIN, ENUMS.ROLES.USER],
      default: ENUMS.ROLES.USER,
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
      validate: {
        validator: (value) => {
          // Check only allowed characters
          if (!/^\+?[\d\s()-]+$/.test(value)) {
            return false;
          }

          // Count only digits
          const digits = value.replace(/\D/g, "");

          return digits.length >= 5 && digits.length <= 15;
        },
        message: "Invalid phone number",
      },
    },
    country: {
      type: String,
      required: [true, "Country is required"],
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    stateRegion: {
      type: String,
      trim: true,
    },
    preferredCurrency: {
      type: String,
      trim: true,
    },

    foundingParticipant: {
      type: Boolean,
      default: false,
    },
    foundingParticipantSource: {
      type: String,
      trim: true,
    },
    founderWaitlistStatus: {
      type: String,
      enum: [
        ENUMS.FOUNDER_WAITLIST_STATUS.NOT_ON_LIST,
        ENUMS.FOUNDER_WAITLIST_STATUS.ON_WAITLIST,
      ],
      default: ENUMS.FOUNDER_WAITLIST_STATUS.NOT_ON_LIST,
    },
    founderApplicantStatus: {
      type: String,
      enum: [
        ENUMS.FOUNDER_APPLICANT_STATUS.NONE,
        ENUMS.FOUNDER_APPLICANT_STATUS.APPLIED,
        ENUMS.FOUNDER_APPLICANT_STATUS.IN_PROGRESS,
        ENUMS.FOUNDER_APPLICANT_STATUS.COMPLETED,
        ENUMS.FOUNDER_APPLICANT_STATUS.CANCELLED,
        ENUMS.FOUNDER_APPLICANT_STATUS.ON_HOLD,
      ],
      default: ENUMS.FOUNDER_APPLICANT_STATUS.NONE,
    },
    founderQualificationStatus: {
      type: String,
      required: [true, "Founder qualification status is required"],
      enum: [
        ENUMS.FOUNDER_QUALIFICATION_STATUS.NOT_STARTED,
        ENUMS.FOUNDER_QUALIFICATION_STATUS.PENDING_VERIFICATION,
        ENUMS.FOUNDER_QUALIFICATION_STATUS.PENDING_PROFILE,
        ENUMS.FOUNDER_QUALIFICATION_STATUS.PENDING_DISCLOSURES,
        ENUMS.FOUNDER_QUALIFICATION_STATUS.PENDING_ACTIVATION,
      ],
      default: ENUMS.FOUNDER_QUALIFICATION_STATUS.NOT_STARTED,
    },
    founderTier: {
      type: String,
      required: [true, "Founder tier is required"],
      enum: [
        ENUMS.FOUNDER_TIER.NONE,
        ENUMS.FOUNDER_TIER.ESSENTIAL_100,
        ENUMS.FOUNDER_TIER.EXPANDED_500,
        ENUMS.FOUNDER_TIER.PREMIUM_1000,
      ],
      default: ENUMS.FOUNDER_TIER.NONE,
    },
    permanentFounderNumber: {
      type: Number,
      default: undefined,
      unique: true,
      sparse: true,
    },
    founderActivationDate: {
      type: Date,
      default: undefined,
    },
    founderEnrollmentDeadline: {
      type: Date,
      default: undefined,
    },
    founderBenefitsVersion: {
      type: String,
      trim: true,
    },
    contactMethod: {
      type: String,
      enum: [
        ENUMS.CONTACT_METHODS.EMAIL,
        ENUMS.CONTACT_METHODS.PHONE,
        ENUMS.CONTACT_METHODS.SMS,
      ],
      default: ENUMS.CONTACT_METHODS.EMAIL,
    },
    additionalNotes: {
      //Anything else you would like us to know?
      type: String,
      trim: true,
      maxLength: [1000, "Additional notes must be less than 1000 characters"],
    },
    status: {
      type: String,
      enum: [ENUMS.AUTH_STATUS.ACTIVE, ENUMS.AUTH_STATUS.PENDING_VERIFICATION],
      default: ENUMS.AUTH_STATUS.ACTIVE,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

//Following are called hooks in mongoose

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

// this will be used to get the full name of the user, computed never stored in database
userSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`;
});

const User = model("User", userSchema);
export default User;
