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
        { error: 'orderId and shopId are required' },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return NextResponse.json(
        { error: 'Invalid orderId format' },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(shopId)) {
      return NextResponse.json(
        { error: 'Invalid shopId format' },
        { status: 400 }
      );
    }

    // Atomic update: only update if status is "accepted" and acceptedBy matches shopId
    const updatedOrder = await Order.findOneAndUpdate(
      {
        _id: orderId,
        status: 'accepted',
        acceptedBy: shopId,
      },
      {
        $set: { status: 'delivered' },
      },
      { new: true }
    );

    if (!updatedOrder) {
      const existingOrder = await Order.findById(orderId);

      if (!existingOrder) {
        return NextResponse.json(
          { error: 'Order not found' },
          { status: 404 }
        );
      }

      if (existingOrder.status === 'pending') {
        return NextResponse.json(
          { error: 'Order must be accepted before marking as delivered' },
          { status: 400 }
        );
      }

      if (existingOrder.status === 'delivered') {
        return NextResponse.json(
          { error: 'Order has already been delivered' },
          { status: 409 }
        );
      }

      if (existingOrder.acceptedBy?.toString() !== shopId) {
        return NextResponse.json(
          { error: 'Only the shop that accepted this order can mark it as delivered' },
          { status: 403 }
        );
      }

      return NextResponse.json(
        { error: 'Unable to update order' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        message: 'Order marked as delivered',
        order: {
          id: updatedOrder._id,
          status: updatedOrder.status,
          updatedAt: updatedOrder.updatedAt,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Mark delivered error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
