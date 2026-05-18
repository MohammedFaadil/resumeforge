import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, phone: true, email: true }
    });

    return NextResponse.json(user, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: "Error fetching profile" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name, phone } = await req.json();

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: { name, phone },
    });

    return NextResponse.json({ message: "Profile updated successfully", user: updatedUser }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: "Error updating profile" }, { status: 500 });
  }
}
