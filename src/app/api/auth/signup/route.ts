import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { sendWelcomeEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const { name, phone, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      if (existingUser.passwordHash) {
        return NextResponse.json({ message: "Email already registered with a password. Please log in." }, { status: 400 });
      } else {
        // User exists via Google SSO but has no password. Link accounts by adding password.
        const passwordHash = await bcrypt.hash(password, 10);
        await prisma.user.update({
          where: { email },
          data: {
            passwordHash,
            phone: phone || existingUser.phone,
          },
        });
        return NextResponse.json({ message: "Password added to your existing Google account. You can now log in with either method." }, { status: 200 });
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        phone: phone || null,
        passwordHash,
        provider: "credentials",
        role: "USER",
        status: "APPROVED", // Auto approve normal users as per previous plan
      },
    });

    // Send welcome email asynchronously without blocking the response
    sendWelcomeEmail(email, name).catch(err => console.error("Welcome email failed to send:", err));

    return NextResponse.json({ message: "User created successfully" }, { status: 201 });
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
