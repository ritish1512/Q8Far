import nodemailer from "nodemailer";

export async function sendPasswordResetEmail(email: string, resetUrl: string) {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const password = process.env.SMTP_PASSWORD;
  const from = process.env.SMTP_FROM || user;

  if (!host || !user || !password || !from) {
    throw new Error("SMTP settings are not configured");
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass: password },
  });

  await transporter.sendMail({
    from,
    to: email,
    subject: "Reset your Q8Far center password",
    text: `Use this link to set a new password for your Q8Far center account. The link expires in one hour:\n\n${resetUrl}`,
    html: `<p>Use the link below to set a new password for your Q8Far center account.</p><p><a href="${resetUrl}">Change password</a></p><p>This link expires in one hour.</p>`,
  });
}