const asyncHandler = require("express-async-handler");
const PDFDocument = require("pdfkit");
const Product = require("../model/productModel");
const BiddingProduct = require("../model/biddingProductModel");
const sendEmail = require("../utils/sendEmail");
const User = require("../model/userModel");
const Cart = require("../model/cartModel");
const Order = require("../model/orderModel");

const addToCart = asyncHandler(async (req, res) => {
  const { productId } = req.body;
  const userId = req.user.id;

  // 1. Check if product exists and is available
  const product = await Product.findById(productId);
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  if (!product.isverify) {
    res.status(400);
    throw new Error("This product is not verified for sale.");
  }

  if (product.isSoldout) {
    res.status(400);
    throw new Error("This product has already been sold out.");
  }

  // 2. Check if product is already in cart
  const existingCartItem = await Cart.findOne({
    user: userId,
    product: productId,
  });

  if (existingCartItem) {
    res.status(400);
    throw new Error("This product is already in your cart.");
  }

  // 3. Add to cart
  const cartItem = await Cart.create({
    user: userId,
    product: productId,
    quantity: 1, // default to 1 if quantity not supplied
  });

  res.status(201).json(cartItem);
});

const getCartItems = asyncHandler(async (req, res) => {
  const cart = await Cart.find({ user: req.user.id }).populate("product");
  res.status(200).json(cart);
});

const removeFromCart = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const cartItemId = req.params.id;

  // Find the cart item by ID and user
  const cartItem = await Cart.findOne({ _id: cartItemId, user: userId });

  if (!cartItem) {
    res.status(404);
    throw new Error("Cart item not found or does not belong to you");
  }

  await cartItem.remove();
  res.status(200).json({ message: "Item removed from cart" });
});

const placeBid = asyncHandler(async (req, res) => {
  const { productId, price } = req.body;
  const userId = req.user.id;

  const product = await Product.findById(productId);
  if (!product.isverify) {
    res.status(400);
    throw new Error("Bidding is not verified for these products.");
  }

  if (!product || product.isSoldout === true) {
    res.status(400);
    throw new Error("Invalid product or bidding is closed");
  }

  /*  if (price < product.minprice) {
    res.status(400);
    throw new Error("Your bid must be equal to or higher than the minimum bidding price");
  } */

  const existingUserBid = await BiddingProduct.findOne({
    user: userId,
    product: productId,
  });

  if (existingUserBid) {
    if (price <= existingUserBid.price) {
      res.status(400);
      throw new Error("Your bid must be higher than your previous bid");
    }
    existingUserBid.price = price;
    await existingUserBid.save();
    return res.status(200).json({ biddingProduct: existingUserBid });
  } else {
    const highestBid = await BiddingProduct.findOne({
      product: productId,
    }).sort({ price: -1 });
    if (highestBid && price <= highestBid.price) {
      res.status(400);
      throw new Error("Your bid must be higher than the current highest bid");
    }

    const biddingProduct = await BiddingProduct.create({
      user: userId,
      product: productId,
      price,
    });

    res.status(201).json(biddingProduct);
  }
});

const placeOrder = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const cartItems = await Cart.find({ user: userId }).populate("product");
  if (!cartItems.length) {
    res.status(400);
    throw new Error("Your cart is empty.");
  }

  const totalAmount = cartItems.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  const user = await User.findById(userId);

  const order = await Order.create({
    user: userId,
    products: cartItems.map((item) => ({
      product: item.product._id,
      quantity: item.quantity,
    })),
    totalAmount,
  });

  await Cart.deleteMany({ user: userId });

  // 📄 Generate PDF Invoice
  const doc = new PDFDocument();
  let buffers = [];
  doc.on("data", buffers.push.bind(buffers));
  doc.on("end", async () => {
    const pdfBuffer = Buffer.concat(buffers);

    const shipping = user.shippingAddress || {};
    const formattedShipping = `
${shipping.fullName || ""}
${shipping.address || ""}, ${shipping.city || ""}
${shipping.postalCode || ""}, ${shipping.country || ""}
    `;

    const message = `Dear ${user.name},

Thank you for your order. Please find your invoice attached.

Total: $${totalAmount.toFixed(2)}

Regards,
butimepieces.com Team`;

    await sendEmail({
      email: user.email,
      subject: "🧾 Invoice - Order Confirmation",
      message,
      attachments: [
        {
          filename: "invoice.pdf",
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    });

    res.status(201).json({ message: "Order placed successfully", order });
  });

  // 🧾 PDF content
  doc.fontSize(20).text("Invoice", { align: "center" });
  doc.moveDown();

  doc.fontSize(14).text(`Customer: ${user.name}`);
  doc.text(`Email: ${user.email}`);
  doc.moveDown();

  doc.fontSize(14).text("Shipping Address:");
  doc.text(formattedShipping);
  doc.moveDown();

  doc.text("Items Ordered:", { underline: true });
  cartItems.forEach((item, index) => {
    doc.text(
      `${index + 1}. ${item.product.title} x${item.quantity} - $${(
        item.product.price * item.quantity
      ).toFixed(2)}`
    );
  });

  doc.moveDown();
  doc.text(`Total Amount: $${totalAmount.toFixed(2)}`, { bold: true });

  doc.end(); // finish PDF stream
});


const getBiddingHistory = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  const biddingHistory = await BiddingProduct.find({ product: productId })
    .sort("-createdAt")
    .populate("user")
    .populate("product");

  res.status(200).json(biddingHistory);
});

const getOrderHistory = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const orders = await Order.find({ user: userId })
    .populate("products.product")
    .sort({ createdAt: -1 });

  res.status(200).json(orders);
});

const sellProduct = asyncHandler(async (req, res) => {
  const { productId } = req.body;
  const userId = req.user.id;

  // Find the product
  const product = await Product.findById(productId);
  if (!product) {
    return res.status(404).json({ error: "Product not found" });
  }

  //   /* const currentTime = new Date();
  //   const tenMinutesAgo = new Date(currentTime - 2 * 60 * 1000); // 10 minutes ago

  //     if (!product.isSoldout || product.updatedAt < tenMinutesAgo || product.createdAt < tenMinutesAgo) {
  //     return res.status(400).json({ error: "Product cannot be sold at this time" });
  //   } */

  // Check if the user is authorized to sell the product
  if (product.user.toString() !== userId) {
    return res
      .status(403)
      .json({ error: "You do not have permission to sell this product" });
  }

  // Find the highest bid
  const highestBid = await BiddingProduct.findOne({ product: productId })
    .sort({ price: -1 })
    .populate("user");
  if (!highestBid) {
    return res
      .status(400)
      .json({ error: "No winning bid found for the product" });
  }

  // Calculate commission and final price
  const commissionRate = product.commission;
  const commissionAmount = (commissionRate / 100) * highestBid.price;
  const finalPrice = highestBid.price - commissionAmount;

  // Update product details
  product.isSoldout = true;
  product.soldTo = highestBid.user;
  product.soldPrice = finalPrice;

  // Update admin's commission balance
  const admin = await User.findOne({ role: "admin" });
  if (admin) {
    admin.commissionBalance += commissionAmount;
    await admin.save();
  }

  // Update seller's balance
  const seller = await User.findById(product.user);
  if (seller) {
    seller.balance += finalPrice; // Add the remaining amount to the seller's balance
    await seller.save();
  } else {
    return res.status(404).json({ error: "Seller not found" });
  }

  // Save product
  await product.save();

  // Send email notification to the highest bidder
  await sendEmail({
    email: highestBid.user.email,
    subject: "Congratulations! You won the auction!",
    message: `You have won the auction for "${product.title}" with a bid of $${highestBid.price}.`,
  });

  res.status(200).json({ message: "Product has been successfully sold!" });
});

module.exports = {
  placeBid,
  addToCart,
  getCartItems,
  removeFromCart,
  getBiddingHistory,
  sellProduct,
  placeOrder,
  getOrderHistory,
};
