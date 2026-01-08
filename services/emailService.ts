
/**
 * TeleFlow Email Service
 * Integration for real-world MCCM Email execution using Resend.
 * 
 * Features:
 * - Professional HTML email templates
 * - Styled CTA buttons (magic links)
 * - Mobile-responsive design
 */
export const emailService = {
  /**
   * Generate professional HTML email template
   * @param greeting - Personalized greeting
   * @param marketingCopy - AI-generated marketing copy
   * @param ctaLink - Magic link to landing page
   * @param ctaText - CTA button text
   * @returns HTML string
   */
  generateEmailHTML(
    greeting: string,
    marketingCopy: string,
    ctaLink: string,
    ctaText: string = 'Claim Offer Now'
  ): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Special Offer</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f1fafd;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f1fafd;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <!-- Main Container -->
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0b66c3 0%, #26d366 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">🎁 Special Offer</h1>
              <p style="margin: 8px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 16px;">Exclusive for You</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px 0; color: #1e293b; font-size: 16px; line-height: 1.6;">
                ${greeting}
              </p>
              
              <div style="background-color: #f8fafc; border-left: 4px solid #0b66c3; padding: 20px; margin: 24px 0; border-radius: 8px;">
                <p style="margin: 0; color: #334155; font-size: 15px; line-height: 1.7;">
                  ${marketingCopy}
                </p>
              </div>

              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; margin: 32px 0;">
                <tr>
                  <td align="center">
                    <a href="${ctaLink}" 
                       style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #0b66c3 0%, #26d366 100%); color: #ffffff; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 12px rgba(11, 102, 195, 0.3); transition: all 0.3s ease;">
                      ${ctaText} →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Footer Note -->
              <p style="margin: 24px 0 0 0; color: #64748b; font-size: 12px; text-align: center; line-height: 1.5;">
                This offer is valid for a limited time only.<br>
                <a href="${ctaLink}" style="color: #0b66c3; text-decoration: underline;">Click here</a> if the button doesn't work.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 8px 0; color: #64748b; font-size: 12px;">
                <strong style="color: #1e293b;">TeleFlow</strong> - Next-Gen Telecom MCCM
              </p>
              <p style="margin: 0; color: #94a3b8; font-size: 11px;">
                You received this email because you're a valued customer.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
  },

  /**
   * Send marketing email via Resend API
   * @param to - Recipient email address
   * @param subject - Email subject
   * @param greeting - Personalized greeting
   * @param marketingCopy - AI-generated marketing copy
   * @param ctaLink - Magic link to landing page
   * @param ctaText - CTA button text (optional)
   * @returns Success status and message ID
   */
  async sendMarketingEmail(
    to: string,
    subject: string,
    greeting: string,
    marketingCopy: string,
    ctaLink: string,
    ctaText?: string
  ) {
    console.log(`[Email Service] Preparing to send real email to: ${to}`);

    // Use key from environment variables
    const RESEND_API_KEY = import.meta.env.VITE_RESEND_API_KEY;
    const RESEND_VERIFIED_DOMAIN = import.meta.env.VITE_RESEND_VERIFIED_DOMAIN; // e.g., 'teleflow.ai'
    const RESEND_REGISTERED_EMAIL = import.meta.env.VITE_RESEND_REGISTERED_EMAIL; // e.g., 'zhangchongda1@gmail.com'

    if (!RESEND_API_KEY) {
      console.warn('[Email Service] VITE_RESEND_API_KEY not found, using mock mode');
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({ success: true, messageId: `mock_${Date.now()}`, isMock: true });
        }, 800);
      });
    }

    // ✅ Fix: Check if domain is verified
    const isDomainVerified = !!RESEND_VERIFIED_DOMAIN;
    const registeredEmail = RESEND_REGISTERED_EMAIL || 'zhangchongda1@gmail.com'; // Fallback to common test email

    // ✅ Fix: In development, if domain is not verified, only allow sending to registered email
    if (import.meta.env.DEV && !isDomainVerified) {
      if (to.toLowerCase() !== registeredEmail.toLowerCase()) {
        console.warn(
          `[Email Service] ⚠️ Resend限制：未验证域名时，只能发送到注册邮箱 (${registeredEmail})。` +
          `当前收件人: ${to}。` +
          `解决方案：1) 在 Resend 验证域名 (resend.com/domains)，或 2) 使用注册邮箱进行测试。` +
          `\n自动切换到 Mock 模式以继续演示...`
        );
        // Fallback to mock mode for demo continuity
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({ success: true, messageId: `mock_${Date.now()}`, isMock: true });
          }, 800);
        });
      }
    }

    try {
      // Generate professional HTML email
      const htmlContent = this.generateEmailHTML(greeting, marketingCopy, ctaLink, ctaText);

      // Use local proxy in DEV to bypass CORS
      const endpoint = import.meta.env.DEV ? '/api/email' : 'https://api.resend.com/emails';

      // ✅ Fix: Use verified domain if available, otherwise use onboarding@resend.dev
      const fromAddress = isDomainVerified
        ? `TeleFlow <noreply@${RESEND_VERIFIED_DOMAIN}>`
        : 'TeleFlow <onboarding@resend.dev>';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromAddress,
          to: to,
          subject: subject,
          html: htmlContent
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('[Email Service] Resend API Error:', data);
        
        // ✅ Fix: Provide helpful error message for domain verification
        if (data.statusCode === 403 && data.message?.includes('testing emails')) {
          const helpfulMessage = 
            `\n⚠️ Resend 限制：未验证域名时，只能发送到注册邮箱。\n` +
            `解决方案：\n` +
            `1. 在 Resend 控制台验证域名：https://resend.com/domains\n` +
            `2. 配置环境变量 VITE_RESEND_VERIFIED_DOMAIN=yourdomain.com\n` +
            `3. 或使用注册邮箱 (${registeredEmail}) 进行测试\n`;
          console.warn(helpfulMessage);
        }
        
        throw new Error(data.message || 'Resend API failure');
      }

      console.log(`[Email Service] ✅ REAL SUCCESS: ${subject}`, data);
      return { success: true, messageId: data.id, isMock: false };
    } catch (error: any) {
      console.warn(`[Email Service] Sending failed, falling back to mock UI response. Reason: ${error.message}`);

      // Fallback for demo continuity
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({ success: true, messageId: `mock_${Date.now()}`, isMock: true });
        }, 800);
      });
    }
  }
};
