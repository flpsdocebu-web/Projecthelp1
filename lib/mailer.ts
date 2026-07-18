import nodemailer from "nodemailer";

const value = (key: string) => process.env[key]?.trim() || "";

export function mailIsConfigured() {
  return Boolean(value("SMTP_HOST") && value("SMTP_USER") && value("SMTP_PASSWORD"));
}

export async function sendMail(options: { to: string; subject: string; text: string; html: string }) {
  const port = Number(value("SMTP_PORT") || 465);
  const secure = value("SMTP_SECURE")
    ? value("SMTP_SECURE").toLowerCase() === "true"
    : port === 465;
  const user = value("SMTP_USER");
  const transporter = nodemailer.createTransport({
    host: value("SMTP_HOST"),
    port,
    secure,
    auth: { user, pass: value("SMTP_PASSWORD") },
  });
  await transporter.sendMail({
    from: value("SMTP_FROM") || `Project HELPS <${user}>`,
    replyTo: value("SUPPORT_EMAIL") || "daniel.reyes01@deped.gov.ph",
    ...options,
  });
}
