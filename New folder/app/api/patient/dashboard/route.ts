import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Order from '@/models/Order';
import Prescription from '@/models/Prescription';
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
    const [totalOrders, activeOrders, prescriptions, recentOrders] = await Promise.all([
      Order.countDocuments({ patientId }),
      Order.countDocuments({ patientId, status: { $in: ['pending', 'accepted'] } }),
      Prescription.countDocuments({ patientId }),
      Order.find({ patientId })
        .populate('acceptedBy', 'shopName')
        .sort({ createdAt: -1 })
        .limit(5),
    ]);

    return NextResponse.json(
      {
        stats: {
          totalOrders,
          activeOrders,
          prescriptions,
        },
        recentOrders: recentOrders.map((order) => {
          const acceptedBy = order.acceptedBy as { shopName?: string } | null;
          return {
            id: order._id,
            medicines: order.medicines,
            status: order.status,
            shopName: acceptedBy?.shopName || null,
            createdAt: order.createdAt,
          };
        }),
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
