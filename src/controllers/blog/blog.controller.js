
import slugify from "slugify";

import blogModel from "../../models/blog/blog.model.js";
import mongoose from "mongoose";
import { uploadBlogImage } from "../../utils/blog/blog.uploads.js";

export const createBlog = async (req, res) => {
  try {
    const { title, content, category, tags, seoTitle, seoDescription } = req.body;

    const slug = slugify(title, { lower: true, strict: true });

    // Prevent duplicate slug
    const existingBlog = await blogModel.findOne({ slug });
    if (existingBlog) {
      return res.status(409).json({
        success: false,
        message: "Blog with this title already exists",
      });
    }

    let coverImage = null;
    if (req.files?.coverImage) {
      coverImage = await uploadBlogImage(req.files.coverImage[0].path);
    }

    let images = [];
    if (req.files?.images) {
      for (const file of req.files.images) {
        const imageUrl = await uploadBlogImage(file.path);
        images.push(imageUrl);
      }
    }

    const blog = await blogModel.create({
      title,
      slug,
      content,
      category,
      tags: tags
        ? tags.split(",").map((tag) => tag.trim())
        : [],
      seoTitle,
      seoDescription,
      coverImage,
      images,
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
      .find({ status: "published" })
      .sort({ createdAt: -1 })
      .select("-content");

    res.json({ success: true, data: blogs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};



export const getBlogBySlug = async (req, res) => {
  try {
    const blog = await blogModel.findOne({ slug: req.params.slug });

    if (!blog) {
      return res
        .status(404)
        .json({ success: false, message: "Blog not found" });
    }

    res.json({ success: true, data: blog });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};



export const updateBlog = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid blog ID" });
    }

    const blog = await blogModel.findById(id);
    if (!blog) {
      return res.status(404).json({ success: false, message: "Blog not found" });
    }

    const {
      title,
      content,
      category,
      tags,
      seoTitle,
      seoDescription,
      status,
    } = req.body;

    if (title) {
      blog.title = title;
      blog.slug = slugify(title, { lower: true, strict: true });
    }
    if (content) blog.content = content;
    if (category) blog.category = category;
    if (tags) blog.tags = tags.split(",").map((t) => t.trim());
    if (seoTitle) blog.seoTitle = seoTitle;
    if (seoDescription) blog.seoDescription = seoDescription;
    if (status) blog.status = status;

    if (req.files?.coverImage) {
      blog.coverImage = await uploadBlogImage(
        req.files.coverImage[0].path
      );
    }

    if (req.files?.images) {
      for (const file of req.files.images) {
        const imageUrl = await uploadBlogImage(file.path);
        blog.images.push(imageUrl);
      }
    }

    await blog.save();

    res.status(200).json({
      success: true,
      message: "Blog updated successfully",
      data: blog,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
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
