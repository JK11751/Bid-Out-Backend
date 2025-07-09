const nodemailer = require("nodemailer");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

const sendEmail = async (options) => {
  if (!options.email) throw new Error("No recipients defined");

  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    auth: {
      user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_PASS,
    },
  });

  // Generate file path
  const invoicePath = path.join(
    __dirname,
    `../invoices/invoice-${Date.now()}.pdf`
  );
  fs.mkdirSync(path.dirname(invoicePath), { recursive: true });

  const doc = new PDFDocument({ margin: 50 });
  const writeStream = fs.createWriteStream(invoicePath);
  doc.pipe(writeStream);

  // Header
  doc
    .fillColor("#333")
    .fontSize(22)
    .text("INVOICE", { align: "center" })
    .moveDown();

  // Customer Info
  doc
    .fontSize(14)
    .fillColor("#444")
    .text(`Customer Name: ${options.name}`)
    .text(`Customer Email: ${options.email}`)
    .text(`Total Amount: $${options.amount}`)
    .moveDown();

  // Address
  if (options.shipping) {
    doc
      .fillColor("#000")
      .fontSize(12)
      .text("Shipping Address", { underline: true })
      .moveDown(0.3)
      .text(`Full Name: ${options.shipping.fullName}`)
      .text(`Address: ${options.shipping.address}`)
      .text(`City: ${options.shipping.city}`)
      .text(`Postal Code: ${options.shipping.postalCode}`)
      .text(`Country: ${options.shipping.country}`)
      .moveDown();
  }

  // Divider
  doc
    .moveTo(50, doc.y)
    .lineTo(550, doc.y)
    .strokeColor("#CCCCCC")
    .stroke()
    .moveDown();

  // Order Details Table Header
  doc
    .fillColor("#000")
    .fontSize(12)
    .text("Order Details", { underline: true })
    .moveDown(0.5);

  // Table columns
  doc
    .font("Helvetica-Bold")
    .text("No.", 50, doc.y, { width: 40 })
    .text("Product", 90, doc.y, { width: 200 })
    .text("Price", 300, doc.y, { width: 80 })
    .text("Qty", 380, doc.y, { width: 50 })
    .text("Total", 440, doc.y, { width: 100 })
    .moveDown(0.5)
    .font("Helvetica");

  // Table rows
  options.cartItems.forEach((item, index) => {
    const { title, price } = item.product;
    const quantity = item.quantity;
    const total = (price * quantity).toFixed(2);

    doc
      .text(`${index + 1}`, 50, doc.y, { width: 40 })
      .text(title, 90, doc.y, { width: 200 })
      .text(`$${price}`, 300, doc.y, { width: 80 })
      .text(`${quantity}`, 380, doc.y, { width: 50 })
      .text(`$${total}`, 440, doc.y, { width: 100 });
  });

  doc.moveDown(2);

  doc
    .font("Helvetica-Bold")
    .text(`Grand Total: $${options.amount}`, { align: "right" });

  doc.end();
  await new Promise((resolve) => writeStream.on("finish", resolve));

  // Send email with attachment
  const message = {
    from: `${process.env.SMTP_FROM_NAME} <${process.env.SMTP_FROM_EMAIL}>`,
    to: options.email,
    subject: options.subject,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color: #333;">Order Confirmation</h2>
        <p>Hello ${options.name},</p>
        <p>Thank you for your order!</p>
        <p><strong>Total Paid:</strong> $${options.amount}</p>
        <p>Please find your invoice attached.</p>
        <br/>
        <p>Regards,<br/>butimepieces.com Team</p>
      </div>
    `,
    attachments: [
      {
        filename: "invoice.pdf",
        path: invoicePath,
        contentType: "application/pdf",
      },
    ],
  };

  await transport.sendMail(message);
  fs.unlink(invoicePath, () => {});
};

module.exports = sendEmail;
