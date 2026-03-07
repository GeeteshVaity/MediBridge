import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { generateToken } from '@/lib/jwt';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const body = await request.json();
    const { name, email, phone, password, role, shopName, shopAddress, licenseUrl } = body;

    // Validate required fields
    if (!name || !email || !phone || !password || !role) {
      return NextResponse.json(
        { success: false, message: 'Please provide all required fields' },
        { status: 400 }
      );
    }

    // Validate role
    if (!['patient', 'shopkeeper'].includes(role)) {
      return NextResponse.json(
        { success: false, message: 'Invalid role specified' },
        { status: 400 }
      );
    }

    // Validate shopkeeper-specific fields
    if (role === 'shopkeeper' && (!shopName || !shopAddress)) {
      return NextResponse.json(
        { success: false, message: 'Shopkeepers must provide shop name and address' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Create new user
    const userData: any = {
      name,
      email: email.toLowerCase(),
      phone,
      password,
      role,
    };

    if (role === 'shopkeeper') {
      userData.shopName = shopName;
      userData.shopAddress = shopAddress;
      if (licenseUrl) {
        userData.licenseUrl = licenseUrl;
      }
    }

    const user = await User.create(userData);

    // Generate JWT token
    const token = generateToken(user);

    // Return success response with token
    return NextResponse.json(
      {
        success: true,
        message: 'User created successfully',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          ...(user.role === 'shop' && {
            shopName: user.shopName,
            shopAddress: user.shopAddress,
          }),
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Signup error:', error);

    // Handle mongoose validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json(
        { success: false, message: messages.join(', ') },
        { status: 400 }
      );
    }

    // Handle duplicate key error
    if (error.code === 11000) {
      return NextResponse.json(
        { success: false, message: 'User with this email already exists' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
