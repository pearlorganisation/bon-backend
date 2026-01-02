// routes/blogRoutes.js
import express from "express";
import { createBlog, deleteBlog, getAllBlogs, getBlogBySlug, updateBlog } from "../controllers/blog/blog.controller.js";
import { authorizeRoles, protect } from "../middleware/auth/auth.middleware.js";
import { uploadBlogImage } from "../utils/blog/blog.uploads.js";
import upload from "../middleware/multer.js";


const router = express.Router();

router.post(
  "/",
  protect,
  authorizeRoles("ADMIN", "SUBADMIN"),
  upload.fields([
    { name: "coverImage", maxCount: 1 },
    { name: "images", maxCount: 10 },
  ]),
  createBlog
);


router.get("/", getAllBlogs);
router.get("/:slug", getBlogBySlug);

router.patch(
  "/:id",
  protect,
  authorizeRoles("ADMIN", "SUBADMIN"),
  upload.single("coverImage"),
  updateBlog
);

router.delete("/:id", protect, authorizeRoles("ADMIN", "SUBADMIN"), deleteBlog);

export default router;
