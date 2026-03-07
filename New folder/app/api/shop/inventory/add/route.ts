import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Inventory from '@/models/Inventory';
import mongoose from 'mongoose';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { shopId, medicineName, quantity, expiryDate, brand, price, category } = body;

    // Validate required fields
    if (!shopId || !medicineName || quantity === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: shopId, medicineName, and quantity are required' },
        { status: 400 }
      );
    }

    // Validate shopId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(shopId)) {
      return NextResponse.json(
        { error: 'Invalid shopId format' },
        { status: 400 }
      );
    }

    // Validate quantity is a non-negative number
    if (typeof quantity !== 'number' || quantity < 0) {
      return NextResponse.json(
        { error: 'Quantity must be a non-negative number' },
        { status: 400 }
      );
    }

    // Validate expiryDate if provided
    if (expiryDate && isNaN(Date.parse(expiryDate))) {
      return NextResponse.json(
        { error: 'Invalid expiryDate format' },
        { status: 400 }
      );
    }

    // Create inventory record
    const inventory = await Inventory.create({
      shopId,
      medicineName: medicineName.trim(),
      quantity,
      ...(expiryDate && { expiryDate: new Date(expiryDate) }),
      ...(brand && { brand: brand.trim() }),
      ...(price !== undefined && { price }),
      ...(category && { category: category.trim() }),
    });

    return NextResponse.json(
      {
        message: 'Inventory item added successfully',
        inventory: {
          _id: inventory._id,
          shopId: inventory.shopId,
          medicineName: inventory.medicineName,
          quantity: inventory.quantity,
          expiryDate: inventory.expiryDate,
          brand: inventory.brand,
          price: inventory.price,
          category: inventory.category,
          createdAt: inventory.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Add inventory error:', error);

    if (error instanceof Error && error.name === 'ValidationError') {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
