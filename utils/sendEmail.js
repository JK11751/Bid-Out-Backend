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

  // Create a unique invoice file
  const invoicePath = path.join(
    __dirname,
    `../invoices/invoice-${Date.now()}.pdf`
  );
  fs.mkdirSync(path.dirname(invoicePath), { recursive: true });

  // Generate PDF invoice
  const doc = new PDFDocument();
  const writeStream = fs.createWriteStream(invoicePath);
  doc.pipe(writeStream);

  doc.fontSize(18).text("INVOICE", { align: "center" });
  doc.moveDown();

  doc.fontSize(14).text(`Customer Name: ${options.name}`);
  doc.text(`Customer Email: ${options.email}`);
  doc.text(`Total Amount: $${options.amount}`);
  doc.moveDown();

  if (options.shipping) {
    doc.text("Shipping Address:");
    doc.text(`${options.shipping.fullName}`);
    doc.text(`${options.shipping.address}, ${options.shipping.city}`);
    doc.text(`${options.shipping.postalCode}, ${options.shipping.country}`);
    doc.moveDown();
  }

  if (options.cartItems && options.cartItems.length > 0) {
    doc.text("Order Details:");
    options.cartItems.forEach((item, index) => {
      doc.text(
        `${index + 1}. ${item.product.title} - $${item.product.price} x ${
          item.quantity
        } = $${(item.product.price * item.quantity).toFixed(2)}`
      );
    });
  }

  doc.end();
  await new Promise((resolve) => writeStream.on("finish", resolve));

  // Email Message
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
        <p>Please find the invoice attached.</p>
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

  // Delete file after sending
  fs.unlink(invoicePath, () => {});
};

module.exports = sendEmail;
