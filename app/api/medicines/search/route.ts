import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Inventory from '@/models/Inventory';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || searchParams.get('query') || '';

    // Build match condition - if no query, return all medicines
    const matchCondition: any = {};
    if (query.trim().length > 0) {
      matchCondition.medicineName = { $regex: query, $options: 'i' };
    }

    // Search medicines across all shops
    const medicines = await Inventory.aggregate([
      {
        $match: matchCondition,
      },
      {
        $lookup: {
          from: 'users',
          localField: 'shopId',
          foreignField: '_id',
          as: 'shop',
        },
      },
      {
        $unwind: '$shop',
      },
      {
        $project: {
          _id: 1,
          medicineName: 1,
          quantity: 1,
          expiryDate: 1,
          brand: 1,
          price: 1,
          category: 1,
          shopId: { _id: '$shop._id', name: '$shop.name' },
          shopName: '$shop.name',
          shopAddress: '$shop.address',
        },
      },
      {
        $sort: { medicineName: 1 },
      },
    ]);

    return NextResponse.json(
      {
        medicines,
        count: medicines.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Search medicines error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
