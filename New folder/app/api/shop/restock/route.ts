import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import RestockRequest from '@/models/RestockRequest';
import mongoose from 'mongoose';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { shopId, medicineName, quantity, priority, notes } = body;

    if (!shopId || !medicineName || !quantity) {
      return NextResponse.json(
        { error: 'shopId, medicineName, and quantity are required' },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(shopId)) {
      return NextResponse.json(
        { error: 'Invalid shopId format' },
        { status: 400 }
      );
    }

    if (typeof quantity !== 'number' || quantity < 1) {
      return NextResponse.json(
        { error: 'Quantity must be at least 1' },
        { status: 400 }
      );
    }

    const restockRequest = await RestockRequest.create({
      shopId,
      medicineName: medicineName.trim(),
      quantity,
      ...(priority && { priority }),
      ...(notes && { notes: notes.trim() }),
    });

    return NextResponse.json(
      {
        message: 'Restock request submitted',
        restockRequest,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create restock request error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const shopId = searchParams.get('shopId');

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

    const restockRequests = await RestockRequest.find({ shopId }).sort({ createdAt: -1 });

    return NextResponse.json(
      {
        restockRequests,
        count: restockRequests.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get restock requests error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
