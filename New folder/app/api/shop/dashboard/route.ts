import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Order from '@/models/Order';
import Inventory from '@/models/Inventory';
import User from '@/models/User';
import mongoose from 'mongoose';

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

    // Get shop details and stats
    const [
      shop,
      pendingOrdersCount,
      acceptedOrdersCount,
      totalInventory,
      lowStockCount,
      recentOrders,
      lowStockAlerts,
    ] = await Promise.all([
      User.findById(shopId).select('shopName shopAddress'),
      Order.countDocuments({ status: 'pending' }),
      Order.countDocuments({ acceptedBy: shopId, status: { $in: ['accepted', 'delivered'] } }),
      Inventory.countDocuments({ shopId }),
      Inventory.countDocuments({ shopId, quantity: { $lte: 10 } }),
      Order.find({ acceptedBy: shopId })
        .populate('patientId', 'name')
        .sort({ updatedAt: -1 })
        .limit(5),
      Inventory.find({ shopId, quantity: { $lte: 10 } })
        .sort({ quantity: 1 })
        .limit(5),
    ]);

    if (!shop) {
      return NextResponse.json(
        { error: 'Shop not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        shopName: shop.shopName,
        shopAddress: shop.shopAddress,
        stats: {
          pendingOrders: pendingOrdersCount,
          acceptedOrders: acceptedOrdersCount,
          totalInventory,
          lowStockCount,
        },
        recentOrders: recentOrders.map((order) => {
          const patient = order.patientId as { name?: string } | null;
          return {
            id: order._id,
            patientName: patient?.name || 'Unknown',
            medicines: order.medicines,
            status: order.status,
            updatedAt: order.updatedAt,
          };
        }),
        lowStockAlerts: lowStockAlerts.map((item) => ({
          id: item._id,
          medicineName: item.medicineName,
          quantity: item.quantity,
        })),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Shop dashboard error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
