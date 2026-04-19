import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM_EMAIL = "CycleSync <noreply@cyclesync.app>"

export async function sendOTPEmail(to: string, otp: string, name?: string) {
  const greeting = name ? `Hi ${name}` : "Hi there"
  
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: "Your CycleSync Verification Code",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="text-align: center; margin-bottom: 40px;">
            <h1 style="color: #E11D48; font-size: 28px; margin: 0;">CycleSync</h1>
            <p style="color: #6B7280; margin-top: 8px;">Your personal period tracker</p>
          </div>
          
          <div style="background: linear-gradient(135deg, #FFF1F2 0%, #FCE7F3 100%); border-radius: 16px; padding: 32px; text-align: center;">
            <p style="color: #374151; font-size: 16px; margin: 0 0 24px 0;">${greeting},</p>
            <p style="color: #374151; font-size: 16px; margin: 0 0 24px 0;">Your verification code is:</p>
            <div style="background: white; border-radius: 12px; padding: 20px; display: inline-block; margin-bottom: 24px;">
              <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #E11D48;">${otp}</span>
            </div>
            <p style="color: #6B7280; font-size: 14px; margin: 0;">This code expires in 5 minutes</p>
          </div>
          
          <div style="text-align: center; margin-top: 32px;">
            <p style="color: #9CA3AF; font-size: 12px; margin: 0;">
              If you didn&apos;t request this code, please ignore this email.
            </p>
          </div>
        </div>
      `,
    })
    return { success: true }
  } catch (error) {
    console.error("Failed to send OTP email:", error)
    return { success: false, error }
  }
}

export async function sendWelcomeEmail(to: string, name?: string) {
  const greeting = name ? `Welcome, ${name}!` : "Welcome!"
  
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: "Welcome to CycleSync!",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="text-align: center; margin-bottom: 40px;">
            <h1 style="color: #E11D48; font-size: 28px; margin: 0;">CycleSync</h1>
          </div>
          
          <div style="background: linear-gradient(135deg, #FFF1F2 0%, #FCE7F3 100%); border-radius: 16px; padding: 32px;">
            <h2 style="color: #374151; font-size: 24px; margin: 0 0 16px 0; text-align: center;">${greeting}</h2>
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
              Your account has been created successfully. CycleSync helps you track your menstrual cycle with AI-powered insights.
            </p>
            <ul style="color: #374151; font-size: 14px; line-height: 1.8; padding-left: 20px;">
              <li>Track your periods and symptoms</li>
              <li>Get personalized cycle predictions</li>
              <li>Monitor PCOS risk factors</li>
              <li>Chat with our AI assistant for guidance</li>
            </ul>
            <p style="color: #6B7280; font-size: 14px; margin-top: 24px; font-style: italic;">
              Your health data is encrypted and secure. Only you can access it.
            </p>
          </div>
        </div>
      `,
    })
    return { success: true }
  } catch (error) {
    console.error("Failed to send welcome email:", error)
    return { success: false, error }
  }
}

export async function sendPasswordResetEmail(to: string, otp: string) {
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: "Reset Your CycleSync Password",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="text-align: center; margin-bottom: 40px;">
            <h1 style="color: #E11D48; font-size: 28px; margin: 0;">CycleSync</h1>
          </div>
          
          <div style="background: linear-gradient(135deg, #FFF1F2 0%, #FCE7F3 100%); border-radius: 16px; padding: 32px; text-align: center;">
            <h2 style="color: #374151; font-size: 20px; margin: 0 0 16px 0;">Password Reset Request</h2>
            <p style="color: #374151; font-size: 16px; margin: 0 0 24px 0;">Use this code to reset your password:</p>
            <div style="background: white; border-radius: 12px; padding: 20px; display: inline-block; margin-bottom: 24px;">
              <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #E11D48;">${otp}</span>
            </div>
            <p style="color: #6B7280; font-size: 14px; margin: 0;">This code expires in 5 minutes</p>
          </div>
          
          <div style="text-align: center; margin-top: 32px;">
            <p style="color: #9CA3AF; font-size: 12px; margin: 0;">
              If you didn&apos;t request a password reset, please secure your account.
            </p>
          </div>
        </div>
      `,
    })
    return { success: true }
  } catch (error) {
    console.error("Failed to send password reset email:", error)
    return { success: false, error }
  }
}
