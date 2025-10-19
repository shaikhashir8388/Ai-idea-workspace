import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import { verifyToken, extractTokenFromHeader } from "@/lib/auth";

// Helper function to get user ID from either session or token
async function getUserId(request: Request): Promise<string | null> {
  console.log('🔍 Getting user ID from request...');
  
  // Try NextAuth session first
  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    console.log('✅ Using NextAuth session:', session.user.id);
    return session.user.id;
  }

  // Try JWT token from Authorization header
  const authHeader = request.headers.get('authorization');
  console.log('🔍 Authorization header:', authHeader);
  
  if (!authHeader) {
    console.log('❌ No authorization header found');
    return null;
  }

  const token = extractTokenFromHeader(authHeader);
  console.log('🔍 Extracted token:', token ? 'Token present' : 'No token');
  
  if (token) {
    const payload = verifyToken(token);
    if (payload) {
      console.log('✅ Using JWT token:', payload.id);
      return payload.id;
    } else {
      console.log('❌ Invalid JWT token');
    }
  }

  console.log('❌ No valid authentication found');
  return null;
}

export async function POST(request: Request) {
  try {
    const userId = await getUserId(request);
    
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { title, description } = await request.json();

    const idea = await prisma.idea.create({
      data: {
        title,
        description,
        userId,
      },
    });

    return NextResponse.json(idea);
  } catch (error) {
    console.error("Failed to create idea:", error);
    return NextResponse.json(
      { error: "Failed to create idea" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const userId = await getUserId(request);
    
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const ideas = await prisma.idea.findMany({
      where: {
        userId
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        user: true,
      },
    });

    return NextResponse.json(ideas);
  } catch (error) {
    console.error("Failed to fetch ideas:", error);
    return NextResponse.json(
      { error: "Failed to fetch ideas" },
      { status: 500 }
    );
  }
}