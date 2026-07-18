type PasswordResetEmailOptions = {
  resetPasswordLink: string;
};

export function createPasswordResetEmail({ resetPasswordLink }: PasswordResetEmailOptions) {
  const subject = "Reset your Project HELPS password";

  const text = `Hello,

We received a request to reset the password for your account.

To create a new password, please open the secure link below:

Reset Your Password
${resetPasswordLink}

If the link above does not work, copy and paste the URL into your web browser.

For your security, this link will expire in 60 minutes and can only be used once.

If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged, and no further action is required.

If you continue to experience issues, please contact our support team for assistance. You may reach Mr. Daniel P. Reyes at 09912080396 or daniel.reyes01@deped.gov.ph.

Thank you,

Project HELPS - Technical Team`;

  const safeLink = escapeHtml(resetPasswordLink);
  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#edf7f2;font-family:Arial,Helvetica,sans-serif;color:#173f34;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#edf7f2;padding:32px 14px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border:1px solid #d6e8df;border-radius:18px;overflow:hidden;box-shadow:0 14px 35px rgba(20,75,58,.12);">
            <tr>
              <td style="padding:24px 30px;background:linear-gradient(135deg,#0d6f62,#167fab);color:#ffffff;">
                <div style="font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;">Project HELPS</div>
                <div style="margin-top:6px;font-size:25px;font-weight:800;">Password Reset Request</div>
              </td>
            </tr>
            <tr>
              <td style="padding:30px;line-height:1.65;font-size:15px;">
                <p style="margin:0 0 18px;">Hello,</p>
                <p style="margin:0 0 18px;">We received a request to reset the password for your account.</p>
                <p style="margin:0 0 22px;">To create a new password, please click the secure button below:</p>
                <p style="margin:0 0 24px;text-align:center;">
                  <a href="${safeLink}" style="display:inline-block;padding:14px 24px;border-radius:10px;color:#ffffff;background:#126b59;text-decoration:none;font-weight:800;">Reset Your Password</a>
                </p>
                <p style="margin:0 0 8px;">If the button above does not work, copy and paste the following URL into your web browser:</p>
                <p style="margin:0 0 22px;padding:12px;border-radius:8px;background:#f0f7f3;word-break:break-all;"><a href="${safeLink}" style="color:#126b59;">${safeLink}</a></p>
                <p style="margin:0 0 18px;"><strong>For your security, this link will expire in 60 minutes and can only be used once.</strong></p>
                <p style="margin:0 0 18px;">If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged, and no further action is required.</p>
                <p style="margin:0 0 22px;">If you continue to experience issues, please contact our support team for assistance. You may reach Mr. Daniel P. Reyes at <a href="tel:09912080396" style="color:#126b59;">09912080396</a> or <a href="mailto:daniel.reyes01@deped.gov.ph" style="color:#126b59;">daniel.reyes01@deped.gov.ph</a>.</p>
                <p style="margin:0;">Thank you,<br><strong>Project HELPS - Technical Team</strong></p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject, text, html };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
