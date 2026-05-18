import { NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ message: "Email is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({ message: "If that email is registered, we have sent a reset link." }, { status: 200 });
    }

    if (user.provider === "google") {
      return NextResponse.json({ message: "This account uses Google Login. Please log in with Google." }, { status: 400 });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExpiry },
    });

    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/reset-password?token=${resetToken}`;

    // Log for dev
    console.log("-----------------------------------------");
    console.log(`PASSWORD RESET URL FOR ${email}:`);
    console.log(resetUrl);
    console.log("-----------------------------------------");

    await sendPasswordResetEmail(email, resetToken).catch(err => console.error("Password reset email failed to send:", err));

    return NextResponse.json({ message: "If that email is registered, we have sent a reset link." }, { status: 200 });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
