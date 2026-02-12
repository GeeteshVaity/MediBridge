import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Order from '@/models/Order';
import mongoose from 'mongoose';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { patientId, medicines } = body;

    // Validate required fields
    if (!patientId || !medicines) {
      return NextResponse.json(
        { error: 'Missing required fields: patientId and medicines are required' },
        { status: 400 }
      );
    }

    // Validate patientId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(patientId)) {
      return NextResponse.json(
        { error: 'Invalid patientId format' },
        { status: 400 }
      );
    }

    // Validate medicines is an array with at least one item
    if (!Array.isArray(medicines) || medicines.length === 0) {
      return NextResponse.json(
        { error: 'Medicines must be a non-empty array' },
        { status: 400 }
      );
    }

    // Validate each medicine has medicineName and quantity
    for (const medicine of medicines) {
      if (!medicine.medicineName || typeof medicine.medicineName !== 'string') {
        return NextResponse.json(
          { error: 'Each medicine must have a valid medicineName' },
          { status: 400 }
        );
      }
      if (typeof medicine.quantity !== 'number' || medicine.quantity < 1) {
        return NextResponse.json(
          { error: 'Each medicine must have a quantity of at least 1' },
          { status: 400 }
        );
      }
    }

    // Create order with pending status
    const order = await Order.create({
      patientId,
      medicines: medicines.map((m: { medicineName: string; quantity: number; price?: number }) => ({
        medicineName: m.medicineName.trim(),
        quantity: m.quantity,
        price: m.price || 0,
      })),
      status: 'pending',
    });

    return NextResponse.json(
      {
        message: 'Order created successfully',
        order: {
          id: order._id,
          patientId: order.patientId,
          medicines: order.medicines,
          status: order.status,
          createdAt: order.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create order error:', error);

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
