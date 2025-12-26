import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// export const uploadFileToCloudinary = async (files, folder = "images") => {
//   try {
//     const fileArray = Array.isArray(files) ? files : [files];

//     const uploadPromises = fileArray.map(
//       (file) =>
//         new Promise((resolve, reject) => {
//           const isPdf = file.mimetype === "application/pdf";

//           const stream = cloudinary.uploader.upload_stream(
//             {
//               folder, // dynamic folder
//               // resource_type: "auto", // ✅ auto-detects (image, video, pdf, etc.
//               resource_type: isPdf ? "raw" : "image",
//             },
//             (error, result) => {
//               if (error) {
//                 console.error(`Upload failed for ${file.originalname}:`, error);
//                 reject(error);
//               } else {
//                 resolve({
//                   secure_url: result.secure_url,
//                   public_id: result.public_id,
//                   resource_type: result.resource_type, // useful to know if it's video/image
//                 });
//               }
//             }
//           );
//           stream.end(file.buffer); // ✅ Upload buffer (works for Multer files)
//         })
//     );

//     return await Promise.all(uploadPromises);
//   } catch (error) {
//     console.error(`File upload failed: ${error}`);
//     return [];
//   }
// };

export const uploadFileToCloudinary = async (files, folder = "images") => {
  try {
    const fileArray = Array.isArray(files) ? files : [files];

    const uploadPromises = fileArray.map(
      (file) =>
        new Promise((resolve, reject) => {
          const isPdf = file.mimetype === "application/pdf";

          const stream = cloudinary.uploader.upload_stream(
            {
              folder,
              resource_type: isPdf ? "raw" : "auto",

              // ✅ THIS FIXES PDF DOWNLOADING ISSUE
              ...(isPdf && {
                flags: "attachment:false",
                format: "pdf",
              }),
            },
            (error, result) => {
              if (error) {
                console.error(`Upload failed for ${file.originalname}:`, error);
                reject(error);
              } else {
                resolve({
                  secure_url: result.secure_url,
                  public_id: result.public_id,
                  resource_type: result.resource_type,
                  format: result.format,
                });
              }
            }
          );

          stream.end(file.buffer);
        })
    );

    return await Promise.all(uploadPromises);
  } catch (error) {
    console.error(`File upload failed: ${error}`);
    return [];
  }
};

export const deleteFileFromCloudinary = async (
  public_id,
  resource_type = "image"
) => {
  try {
    const result = await cloudinary.uploader.destroy(public_id, {
      resource_type,
    });
    return result;
  } catch (error) {
    console.error(`Failed to delete ${public_id}:`, error);
    throw error;
  }
};
