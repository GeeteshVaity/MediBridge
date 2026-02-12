import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Cart from '@/models/Cart';
import mongoose from 'mongoose';

export async function DELETE(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { patientId } = body;

    if (!patientId) {
      return NextResponse.json(
        { error: 'patientId is required' },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(patientId)) {
      return NextResponse.json(
        { error: 'Invalid patientId format' },
        { status: 400 }
      );
    }

    await Cart.findOneAndUpdate(
      { patientId },
      { $set: { items: [] } },
      { upsert: true }
    );

    return NextResponse.json(
      { message: 'Cart cleared' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Clear cart error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
