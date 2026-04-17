import cloudinary from "cloudinary";
import fs from "fs";
import path from "path";

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadBlogImage = async (filePath) => {
  if (!filePath) return null;

  // Normalize the path for the current OS
  const absolutePath = path.resolve(filePath);

  try {
    // Verify file exists before trying to upload
    if (!fs.existsSync(absolutePath)) {
      console.error("File does not exist at path:", absolutePath);
      return null;
    }

    const result = await cloudinary.v2.uploader.upload(absolutePath, {
      folder: "blogs",
      resource_type: "auto",
    });

    // Delete local file after upload
    fs.unlink(absolutePath, (err) => {
      if (err) console.error("Error deleting local file:", err);
    });

    return result.secure_url;
  } catch (error) {
    console.error("Cloudinary Error:", error);
    // Cleanup even on failure
    if (fs.existsSync(absolutePath)) {
      try {
        fs.unlinkSync(absolutePath);
      } catch (e) {}
    }
    throw new Error("Failed to upload image to Cloudinary");
  }
};
