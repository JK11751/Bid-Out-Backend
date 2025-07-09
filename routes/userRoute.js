const express = require("express");
const router = express.Router();
const { upload } = require("../utils/fileUpload");
const { registerUser,deleteUser, updateUserProfile, loginUser, loginStatus, logoutUser,getShippingAddress, saveShippingAddress, loginAsSeller, estimateIncome, getUser, getUserBalance, getAllUser } = require("../controllers/userCtr");
const { protect, isAdmin } = require("../middleWare/authMiddleWare");

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/loggedin", loginStatus);
router.put("/update-user", protect, upload.single("photo"), updateUserProfile);
router.put("/shipping-address", protect, saveShippingAddress);
router.get("/shipping-address", protect, getShippingAddress);
router.get("/logout", logoutUser);
router.post("/seller", loginAsSeller);
router.get("/getuser", protect, getUser);
router.get("/sell-amount", protect, getUserBalance);

router.get("/estimate-income", protect, isAdmin, estimateIncome);
router.get("/users", protect, isAdmin, getAllUser);
router.delete("/user/:id", protect, isAdmin, deleteUser);


module.exports = router;
