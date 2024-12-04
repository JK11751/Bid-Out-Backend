const asyncHandler = require('express-async-handler');
const Review = require('../model/ReviewModel');
const Product = require('../model/productModel')

const getReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ product: req.params.productId }).populate('user', 'name');
  res.status(200).json(reviews);
});


const createOrUpdateReview = asyncHandler(async (req, res) => {
  const { rating, comment } = req.body;
  const productId = req.params.productId;
  const userId = req.user._id;

    // Check if the product exists
    const product = await Product.findById(productId);
    if (!product) {
      res.status(404);
      throw new Error('Product not found');
    }
  

  // Check if the user is the creator of the product
  if (product.user.toString() === userId.toString()) {
    res.status(400);
    throw new Error('You cannot review your own product');
  }

  // Check if the user has already reviewed this product
  const existingReview = await Review.findOne({ product: productId, user: userId });

  if (existingReview) {
    // Update the existing review
    existingReview.rating = rating;
    existingReview.comment = comment;
    existingReview.edited = true; 
    const updatedReview = await existingReview.save();
    res.status(200).json(updatedReview);
  } else {
    // Create a new review
    const review = new Review({
      product: productId,
      user: userId,
      rating,
      comment,
      edited: false
    });

    const createdReview = await review.save();
    res.status(201).json(createdReview);
  }
});

module.exports = {
  getReviews,
  createOrUpdateReview,
};