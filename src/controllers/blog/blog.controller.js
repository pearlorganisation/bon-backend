import slugify from "slugify";
import path from "path";
import blogModel from "../../models/blog/blog.model.js";
import mongoose from "mongoose";
import { uploadBlogImage } from "../../utils/blog/blog.uploads.js";
import { v2 as cloudinary } from "cloudinary";
export const createBlog = async (req, res) => {
  try {
    const { title, content, category, tags, seoTitle, seoDescription } =
      req.body;
    const slug = slugify(title, { lower: true, strict: true });

    const existingBlog = await blogModel.findOne({ slug });
    if (existingBlog) {
      return res.status(409).json({
        success: false,
        message: "Blog with this title already exists",
      });
    }

    // --- FIX 1: Initialize variables locally first ---
    let coverImage = null;
    let images = [];

    if (req.files?.coverImage?.[0]) {
      const filePath = req.files.coverImage[0].path;
      const uploadedUrl = await uploadBlogImage(filePath);
      if (uploadedUrl) coverImage = uploadedUrl; // Use local variable
    }

    if (req.files?.images) {
      for (const file of req.files.images) {
        const imageUrl = await uploadBlogImage(file.path);
        if (imageUrl) images.push(imageUrl); // Now images is defined
      }
    }

    const blog = await blogModel.create({
      title,
      slug,
      content,
      category,
      tags:
        typeof tags === "string"
          ? tags.split(",").map((tag) => tag.trim())
          : tags || [],
      seoTitle,
      seoDescription,
      coverImage, // Use local variable
      images, // Use local variable
      status: "published",
      author: req.user.id,
    });

    res.status(201).json({ success: true, data: blog });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllBlogs = async (req, res) => {
  try {
    const blogs = await blogModel
      .find() // Removed status: "published" filter so Admins can see drafts
      .sort({ createdAt: -1 });
    // REMOVED .select("-content") so that the Edit form works correctly

    res.json({ success: true, data: blogs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getBlogByIdAndSlug = async (req, res) => {
  try {
    const { id } = req.params;

    const blog = await blogModel.findById(id);

    if (!blog) {
      return res
        .status(404)
        .json({ success: false, message: "Blog not found" });
    }

    res.status(200).json({ success: true, data: blog });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateBlog = async (req, res) => {
  try {
    const { id } = req.params;

    const blog = await blogModel.findById(id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found",
      });
    }

    let {
      title,
      content,
      category,
      tags,
      seoTitle,
      seoDescription,
      status,
      deleteImageUrls, // array of image urls
    } = req.body;

    // Update fields
    if (title) {
      blog.title = title;
      blog.slug = slugify(title, {
        lower: true,
        strict: true,
      });
    }

    if (content) blog.content = content;
    if (category) blog.category = category;
    if (seoTitle) blog.seoTitle = seoTitle;
    if (seoDescription) blog.seoDescription = seoDescription;
    if (status) blog.status = status;

    if (tags) {
      blog.tags =
        typeof tags === "string" ? tags.split(",").map((t) => t.trim()) : tags;
    }

    // =========================
    // DELETE BLOG IMAGES
    // =========================
   if(deleteImageUrls){
    const imagesToDelete = [];
     deleteImageUrls =JSON.parse(deleteImageUrls);
     console.log(deleteImageUrls,typeof deleteImageUrls);
    if (deleteImageUrls && Array.isArray(deleteImageUrls)) {
      imagesToDelete.push(...deleteImageUrls);
    }

    for (const imageUrl of imagesToDelete) {
      // remove from blog.images array
      blog.images = blog.images.filter((img) => img !== imageUrl);

      // extract public id from cloudinary url
      const publicId = imageUrl.split("/").slice(-1)[0].split(".")[0];

      // delete from cloudinary
      await cloudinary.uploader.destroy(`blogs/${publicId}`);
    }
    }

    // =========================
    // UPDATE COVER IMAGE
    // =========================

    if (req.files?.coverImage?.[0]) {
      const uploadedUrl = await uploadBlogImage(req.files.coverImage[0].path);

      if (uploadedUrl) {
        // delete old cover image from cloudinary
        if (blog.coverImage) {
          const oldPublicId = blog.coverImage
            .split("/")
            .slice(-1)[0]
            .split(".")[0];

          await cloudinary.uploader.destroy(`blogs/${oldPublicId}`);
        }

        blog.coverImage = uploadedUrl;
      }
    }

    // =========================
    // ADD NEW IMAGES
    // =========================

    if (req.files?.images) {
      for (const file of req.files.images) {
        const imageUrl = await uploadBlogImage(file.path);

        if (imageUrl) {
          blog.images.push(imageUrl);
        }
      }
    }

    await blog.save();

    return res.status(200).json({
      success: true,
      message: "Blog updated successfully",
      data: blog,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteBlog = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid blog ID",
      });
    }

    const blog = await blogModel.findByIdAndDelete(id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Blog deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
