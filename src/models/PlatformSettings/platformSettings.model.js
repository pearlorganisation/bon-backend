import mongoose from "mongoose";

const platformSettingsSchema = new mongoose.Schema(
  {
    websiteName: { type: String }, 
    supportEmail: { type: String },
    supportPhone: { type: String }, 

    addressLine1: { type: String },
    addressLine2: { type: String },
    homepageBannerText1: { type: String },
    homepageBannerText2: { type: String },
    homepageBannerSubText: {type: String},
    copyrightText: { type: String },
    
    GSTIN: {
       type: String,
    },
   
    socialLinks: {
      facebook: String,
      instagram: String,
      twitter: String,
      linkedin: String,
      whatsapp: String,
    
      pinterest: String,
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