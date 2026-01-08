import cloudinary from "cloudinary";
import fs from "fs";

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadBlogImage = async (filePath) => {
  try {
    const result = await cloudinary.v2.uploader.upload(filePath, {
      folder: "blogs",
    });

    // Remove local file after upload
    fs.unlinkSync(filePath);

    return result.secure_url;
  } catch (error) {
    throw new Error("Blog image upload failed");
  }
};
