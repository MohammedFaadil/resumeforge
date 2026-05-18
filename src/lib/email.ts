import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "fallback_key_if_not_set");
const fromEmail = process.env.FROM_EMAIL || "onboarding@resend.dev"; // Standard default for testing with Resend

export async function sendWelcomeEmail(to: string, name: string) {
  try {
    const data = await resend.emails.send({
      from: fromEmail,
      to,
      subject: "Welcome to ResumeForge!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>Welcome to ResumeForge, ${name}! 🎉</h2>
          <p>We are thrilled to have you on board. ResumeForge is your ultimate tool for building, optimizing, and tracking your ATS-friendly resumes.</p>
          <p>Here are a few things you can do to get started:</p>
          <ul>
            <li>Upload your existing resume to get an instant ATS score.</li>
            <li>Tailor your resume to specific job descriptions.</li>
            <li>Manage multiple variations of your resume seamlessly.</li>
          </ul>
          <p>If you have any questions or feedback, feel free to reach out or use the Feedback section in your dashboard.</p>
          <br/>
          <p>Best Regards,</p>
          <p>The ResumeForge Team</p>
        </div>
      `,
    });
    return data;
  } catch (error) {
    console.error("Failed to send welcome email:", error);
    throw error;
  }
}

export async function sendPasswordResetEmail(to: string, token: string) {
  try {
    const resetUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/reset-password?token=${token}`;
    
    const data = await resend.emails.send({
      from: fromEmail,
      to,
      subject: "Reset your ResumeForge Password",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>Password Reset Request</h2>
          <p>We received a request to reset your password for your ResumeForge account. If you didn't make this request, you can safely ignore this email.</p>
          <p>To reset your password, click the button below:</p>
          <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin-top: 10px; margin-bottom: 20px;">Reset Password</a>
          <p>Or copy and paste this link into your browser:</p>
          <p><a href="${resetUrl}">${resetUrl}</a></p>
          <br/>
          <p>Best Regards,</p>
          <p>The ResumeForge Team</p>
        </div>
      `,
    });
    return data;
  } catch (error) {
    console.error("Failed to send password reset email:", error);
    throw error;
  }
}
