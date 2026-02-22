import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Order from '@/models/Order';
import mongoose from 'mongoose';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { orderId, shopId } = body;

    // Validate required fields
    if (!orderId || !shopId) {
      return NextResponse.json(
        { error: 'Missing required fields: orderId and shopId are required' },
        { status: 400 }
      );
    }

    // Validate orderId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return NextResponse.json(
        { error: 'Invalid orderId format' },
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

    // Atomic update: only update if status is "pending"
    // This prevents race conditions where multiple shops try to accept the same order
    const updatedOrder = await Order.findOneAndUpdate(
      {
        _id: orderId,
        status: 'pending',
      },
      {
        $set: {
          status: 'accepted',
          acceptedBy: shopId,
        },
      },
      {
        new: true, // Return the updated document
      }
    );

    // If no order was updated, it either doesn't exist or was already accepted
    if (!updatedOrder) {
      // Check if order exists to provide better error message
      const existingOrder = await Order.findById(orderId);
      
      if (!existingOrder) {
        return NextResponse.json(
          { error: 'Order not found' },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { error: 'Order has already been accepted by another shop' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        message: 'Order accepted successfully',
        order: {
          id: updatedOrder._id,
          patientId: updatedOrder.patientId,
          medicines: updatedOrder.medicines,
          status: updatedOrder.status,
          acceptedBy: updatedOrder.acceptedBy,
          updatedAt: updatedOrder.updatedAt,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Accept order error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
