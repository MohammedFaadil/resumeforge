import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { message } = await req.json();

    if (!message || message.trim() === "") {
      return NextResponse.json({ message: "Message is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    await prisma.feedback.create({
      data: {
        userId: user.id,
        message,
      },
    });

    return NextResponse.json({ message: "Feedback submitted successfully" }, { status: 201 });
  } catch (error) {
    console.error("Feedback error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
