const mongoose = require("mongoose");

const productSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      require: true,
      ref: "User",
    },
    title: {
      type: String,
      require: [true, "Please add a title"],
      trime: true,
    },
    slug: {
      type: String,
      unique: true,
    },
    description: {
      type: String,
      required: [true, "Please add a description"],
      trime: true,
    },
    image: {
  type: [Object], 
  default: [],
},
    category: {
      type: String,
      required: [true, "Post category is required"],
      default: "All",
    },
    commission: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      require: [true, "Please add a Price"],
    },
    casesize: {
      type: Number,
    },
    material: {
      type: String,
    },
    brand: {
      type: String,
    },
    modelnumber: {
      type: String,
    },
    isverify: {
      type: Boolean,
      default: false,
    },
    isSoldout: {
      type: Boolean,
      default: false,
    },
    soldTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);
const product = mongoose.model("Product", productSchema);
module.exports = product;
