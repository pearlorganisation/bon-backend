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
      websiteName,
      supportEmail,
      supportPhone,
      addressLine1,
      addressLine2,
      homepageBannerText1,
      homepageBannerText2,
       homepageBannerSubText,
      copyrightText,
      facebook,
      instagram,
      twitter,
      linkedin,
    } = req.body;

    let settings = await PlatformSettings.findOne();
    if (!settings) settings = new PlatformSettings();

    settings.websiteName = websiteName;
    settings.supportEmail = supportEmail;
    settings.supportPhone = supportPhone;
    settings.addressLine1 = addressLine1;
    settings.addressLine2 = addressLine2;
    settings.homepageBannerText1 = homepageBannerText1;
    settings.homepageBannerText2 = homepageBannerText2;
    settings.homepageBannerSubText =  homepageBannerSubText;
    settings.copyrightText = copyrightText;
    settings.socialLinks = {
      facebook,
      instagram,
      twitter,
      linkedin,
    };

    await settings.save();

    res.status(200).json({
      message: "Platform settings updated successfully",
      settings,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
