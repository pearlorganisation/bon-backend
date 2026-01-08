import mongoose from "mongoose";

const platformSettingsSchema = new mongoose.Schema(
  {
    websiteName: { type: String }, 
    supportEmail: { type: String },
    supportPhone: { type: String }, 

    addressLine1: { type: String },
    addressLine2: { type: String },

    socialLinks: {
      facebook: String,
      instagram: String,
      twitter: String,
      linkedin: String,
    },

    brandLogo: {
      url: String,
      publicId: String,
    },
    favicon: {
      url: String,
      publicId: String,
    },
  },
  { timestamps: true }
);

export default mongoose.model("PlatformSettings", platformSettingsSchema);