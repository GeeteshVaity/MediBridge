import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Order from '@/models/Order';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const shopId = searchParams.get('shopId');

    // Validate shopId
    if (!shopId) {
      return NextResponse.json(
        { error: 'shopId query parameter is required' },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(shopId)) {
      return NextResponse.json(
        { error: 'Invalid shopId format' },
        { status: 400 }
      );
    }

    // Fetch orders accepted by this shop
    const orders = await Order.find({
      acceptedBy: shopId,
      status: { $in: ['accepted', 'delivered'] },
    })
      .populate('patientId', 'name email')
      .sort({ updatedAt: -1 });

    return NextResponse.json(
      {
        orders,
        count: orders.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get accepted orders error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
