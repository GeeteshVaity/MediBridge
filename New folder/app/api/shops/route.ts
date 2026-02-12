import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    // Build query for shops only
    const query: Record<string, unknown> = { role: 'shop' };

    // Optional search by shop name or address
    if (search) {
      query.$or = [
        { shopName: { $regex: search, $options: 'i' } },
        { shopAddress: { $regex: search, $options: 'i' } },
      ];
    }

    const shops = await User.find(query)
      .select('name email shopName shopAddress createdAt')
      .sort({ shopName: 1 });

    return NextResponse.json(
      {
        shops: shops.map((shop) => ({
          id: shop._id,
          name: shop.name,
          email: shop.email,
          shopName: shop.shopName,
          shopAddress: shop.shopAddress,
        })),
        count: shops.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get shops error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
