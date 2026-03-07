import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Order from '@/models/Order';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');

    // Validate patientId
    if (!patientId) {
      return NextResponse.json(
        { error: 'patientId query parameter is required' },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(patientId)) {
      return NextResponse.json(
        { error: 'Invalid patientId format' },
        { status: 400 }
      );
    }

    // Fetch orders for the patient, populate acceptedBy shop details
    const orders = await Order.find({ patientId })
      .populate('acceptedBy', 'name shopName shopAddress')
      .sort({ createdAt: -1 });

    return NextResponse.json(
      {
        orders,
        count: orders.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get patient orders error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
