import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Order from '@/models/Order';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Fetch all pending orders (not yet accepted by any shop)
    const orders = await Order.find({ status: 'pending' })
      .populate('patientId', 'name email')
      .sort({ createdAt: -1 });

    return NextResponse.json(
      {
        orders,
        count: orders.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get pending orders error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
