import PlatformSettings from "../../models/PlatformSettings/platformSettings.model.js";
import fs from "fs";
import { v2 as cloudinary } from "cloudinary"; 

export const getPlatformSettings = async (req, res) => {
  try {
    const settings = await PlatformSettings.findOne();
    res.status(200).json(settings || {}); 
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updatePlatformSettings = async (req, res) => {
  try {
    const {
      supportEmail,
      supportPhone,
      addressLine1,
      addressLine2,
      facebook,
      instagram,
      
      linkedin,
      whatsapp,
      twitter,
      pinterest,
    } = req.body;

    let settings = await PlatformSettings.findOne();
    if (!settings) settings = new PlatformSettings();

    // Update Text Fields
    settings.supportEmail = supportEmail ?? settings.supportEmail;
    settings.supportPhone = supportPhone ?? settings.supportPhone;
    settings.addressLine1 = addressLine1 ?? settings.addressLine1;
    settings.addressLine2 = addressLine2 ?? settings.addressLine2;

    settings.socialLinks = {
      facebook: facebook ?? settings.socialLinks?.facebook,
      instagram: instagram ?? settings.socialLinks?.instagram,
      twitter: twitter ?? settings.socialLinks?.twitter,
      linkedin: linkedin ?? settings.socialLinks?.linkedin,
      whatsapp: whatsapp ?? settings.socialLinks?.whatsapp,
      pinterest: pinterest ?? settings.socialLinks?.pinterest,
      
    };

    // FIX: Handle Logo Upload for "brandLogo" object
    if (req.files && req.files['logo'] && req.files['logo'][0]) {
      const logoFile = req.files['logo'][0];
      
      try {
        const uploadResult = await cloudinary.uploader.upload(logoFile.path, {
          folder: "platform/logo", // Matching your existing path
        });

        // The JSON shows your DB uses "brandLogo" as an object
        settings.brandLogo = {
          url: uploadResult.secure_url,
          publicId: uploadResult.public_id
        };

        if (fs.existsSync(logoFile.path)) fs.unlinkSync(logoFile.path);
      } catch (err) {
        console.error("Cloudinary Error:", err);
      }
    }

    await settings.save();
    res.status(200).json({ message: "Platform settings updated successfully", settings });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};