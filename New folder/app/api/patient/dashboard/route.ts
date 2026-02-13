import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Order from '@/models/Order';
import Prescription from '@/models/Prescription';
import Cart from '@/models/Cart';
import Notification from '@/models/Notification';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');

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

    // Get order stats
    const [totalOrders, activeOrders, prescriptionCount, completedOrders, cart, recentOrders, notifications] = await Promise.all([
      Order.countDocuments({ patientId }),
      Order.countDocuments({ patientId, status: { $in: ['pending', 'accepted'] } }),
      Prescription.countDocuments({ patientId }),
      Order.countDocuments({ patientId, status: 'delivered' }),
      Cart.findOne({ patientId }),
      Order.find({ patientId })
        .populate('acceptedBy', 'shopName')
        .sort({ createdAt: -1 })
        .limit(5),
      Notification.find({ userId: patientId })
        .sort({ createdAt: -1 })
        .limit(5),
    ]);

    const cartItemsCount = cart?.items?.length || 0;

    return NextResponse.json(
      {
        activeOrders,
        cartItems: cartItemsCount,
        prescriptionCount,
        completedOrders,
        recentOrders: recentOrders.map((order) => {
          const acceptedBy = order.acceptedBy as { shopName?: string } | null;
          return {
            _id: order._id,
            medicines: order.medicines,
            status: order.status,
            acceptedBy: { shopName: acceptedBy?.shopName || null },
            createdAt: order.createdAt,
          };
        }),
        notifications: notifications.map((n) => ({
          _id: n._id,
          message: n.message,
          read: n.read,
          createdAt: n.createdAt,
        })),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Patient dashboard error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
