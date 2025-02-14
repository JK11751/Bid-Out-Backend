const nodemailer = require("nodemailer");

const sendEmail = async (options) => {
  if (!options.email) {
    throw new Error("No recipients defined");
  }
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    auth: {
      user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_PASS,
    },
  });

  const message = {
    from: `${process.env.SMTP_FROM_NAME} <${process.env.SMTP_FROM_EMAIL}> `,
    to: options.email,
    subject: options.subject,
    message: options.message,
    html: `<p>${options.message}</p>`,
  };

  await transport.sendMail(message);
};
module.exports = sendEmail;