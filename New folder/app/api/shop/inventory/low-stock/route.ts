import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Inventory from '@/models/Inventory';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const shopId = searchParams.get('shopId');
    const threshold = parseInt(searchParams.get('threshold') || '10');

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

    // Find items with quantity below threshold
    const lowStockItems = await Inventory.find({
      shopId,
      quantity: { $lte: threshold },
    }).sort({ quantity: 1 });

    return NextResponse.json(
      {
        lowStockItems,
        count: lowStockItems.length,
        threshold,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get low stock error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
