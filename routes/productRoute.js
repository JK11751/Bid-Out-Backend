const express = require("express");
const { getReviews, createOrUpdateReview, } = require("../controllers/reviewCtr");
const {
  createProduct,
  getAllProducts,
  deleteProduct,
  updateProduct,
  getProductBySlug,
  getAllProductsByAmdin,
  deleteProductsByAmdin,
  getAllSoldProducts,
  verifyAndAddCommissionProductByAmdin,
  getAllProductsofUser,
  getWonProducts,
  getProductsByCategory,
  addFavoriteProduct,
  getFavoriteProducts,
  removeFavoriteProduct,
} = require("../controllers/productCtr");
const { upload } = require("../utils/fileUpload");
const { protect, isSeller, isAdmin } = require("../middleWare/authMiddleWare");
const router = express.Router();

router.post("/", protect, isSeller, upload.single("image"), createProduct);
router.delete("/:id", protect, isSeller, deleteProduct);
router.put("/:id", protect, isSeller, upload.single("image"), updateProduct);

router.get("/", getAllProducts);
router.get("/user", protect, getAllProductsofUser);
router.get("/won-products", protect, getWonProducts);
router.get("/sold", getAllSoldProducts);
router.get("/:id", getProductBySlug);
router.post('/favorites', protect, addFavoriteProduct);
router.get('/favorites', protect, getFavoriteProducts);
router.get('/category/:category', getProductsByCategory);

router.get("/:productId/reviews", getReviews);
router.post("/:productId/reviews", protect, createOrUpdateReview,);

// Only access for admin users
router.patch("/admin/product-verified/:id", protect, isAdmin, verifyAndAddCommissionProductByAmdin);
router.get("/admin/products", protect, isAdmin, getAllProductsByAmdin);
router.delete("/admin/products", protect, isAdmin, deleteProductsByAmdin);
router.delete('/favorites/:productId', protect, removeFavoriteProduct);
module.exports = router;
