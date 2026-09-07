import nodemailer from "nodemailer";

/**
 * Dispatches a secure registration magic link activation email to the procurement center.
 * @param toEmail The registered email address of the procurement center admin.
 * @param verificationUrl The complete public verification GET link address endpoint.
 */
export async function sendVerificationEmail(toEmail: string, verificationUrl: string) {
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

  // 2. Draft the HTML payload structured with your exact Tailwind v4 theme colors
  const mailOptions = {
    from,
    to: toEmail,
    subject: "Activate Your Q8Far Procurement Hub Account",
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e2eae4; border-radius: 16px; background-color: #f0f4f1; color: #334155;">
        <div style="margin-bottom: 20px; border-bottom: 1px solid #d5e1eb; padding-bottom: 12px;">
          <h2 style="color: #134e34; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">Q8Far</h2>
        </div>
        
        <p style="font-size: 14px; line-height: 1.6; color: #334155; margin-bottom: 20px;">
          Your procurement center node profile has been successfully recorded in the system distribution grid. Please click the button below to verify your administrative email credentials and activate your live hub dashboard console.
        </p>
        
        <div style="margin: 28px 0; text-align: center;">
          <a href="${verificationUrl}" style="background-color: #134e34; color: #ffffff; text-decoration: none; padding: 12px 28px; font-weight: 600; font-size: 13px; border-radius: 4px; display: inline-block; box-shadow: 0 1px 2px rgba(0,0,0,0.05); letter-spacing: 0.5px;">Verify & Activate Center Account</a>
        </div>
        
        <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin-bottom: 20px;">
          If the button above does not work correctly, copy and paste this complete destination URL address string directly into your browser tab:
          <br />
          <a href="${verificationUrl}" style="color: #b45309; word-break: break-all; font-size: 12px;">${verificationUrl}</a>
        </p>
        
        <div style="border-t: 1px solid #e2eae4; padding-top: 16px; margin-top: 24px; font-size: 10px; text-transform: uppercase; color: #94a3b8; letter-spacing: 1px; text-align: center;">
          🔒 Secure Link Valid for 24 Hours • Q8Far network node
        </div>
      </div>
    `,
  };

  // 3. Dispatch the message container through the protocol stream
  return await transporter.sendMail(mailOptions);
}
