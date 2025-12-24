import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const auth_schema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },

    //  Email field - unique & lowercase
    email: {
      type: String,
      required: true,
      lowercase: true,
      unique: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email address",
      ],
    },

    // ✅ Phone number - unique
    phoneNumber: {
      type: String,
      validate: {
        validator: function (value) {
          // Indian phone number format (10 digits, starts with 6-9)d
          return /^[6-9]\d{9}$/.test(value);
        },
        message:
          "Invalid phone number format. Must be a 10-digit valid Indian number.",
      },
    },

    //  For email verification
    isVerified: { type: Boolean, default: false },

    password: { type: String, required: true },

    role: {
      type: String,
      enum: ["CUSTOMER", "ADMIN", "PARTNER", "SUB_ADMIN"],
      default: "CUSTOMER",
    },
    dateOfBirth: {
      type: Date,
      required: false,
      validate: {
        validator: function (value) {
          // Check if date is valid and not in futures
          const today = new Date();
          return value <= today;
        },
        message: "Date of birth cannot be in the future!",
      },
    },
    gender: { type: String, enum: ["male", "female", "other"] },
    address: String,
    city: String,
    state: String,
    country: String,
    pincode: String,
    // Cloudinary profile image
    profileImageUrl: {
      secure_url: { type: String },
      public_id: { type: String },
    },
    refresh_token: { type: String },
  },
  { timestamps: true }
);

//
// ✅ Password hashing before saving
//
auth_schema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

//
// ✅ Compare password
//
auth_schema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

//
// ✅ Access token (short-lived, e.g., 15m)
//
auth_schema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      name: this.name,
      role: this.role,
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
  );
};

auth_schema.methods.generateRefreshToken = function () {
  return jwt.sign({ _id: this._id }, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
  });
};

const Auth = mongoose.model("Auth", auth_schema);
export default Auth;
