const express = require("express");
const {addToCart , getCartItems, getBiddingHistory, sellProduct, removeFromCart } = require("../controllers/biddingCtr");
const { protect, isSeller } = require("../middleWare/authMiddleWare");
const router = express.Router();

router.post("/cart", protect, addToCart);
router.get("/cart", protect, getCartItems);
router.post("/sell", protect, isSeller, sellProduct);
router.delete("/cart/:id", protect, removeFromCart); 
router.get("/:productId", getBiddingHistory);
module.exports = router;
