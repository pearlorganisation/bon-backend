

export const validateFileSize = (files, type) => {
  const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB
  const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100 MB

  for (const file of files) {
    const limit = type === "image" ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE;
    if (file.size > limit) {
      return `File ${
        file.originalname
      } is too large. Max size for ${type}s is ${limit / (1024 * 1024)} MB.`;
    }
  }
  return null;
};
