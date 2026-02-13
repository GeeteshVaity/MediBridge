import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import MedicineRequest from '@/models/MedicineRequest';
import Notification from '@/models/Notification';
import User from '@/models/User';
import mongoose from 'mongoose';

// POST - Mark a medicine request as fulfilled (shopkeeper restocking)
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { requestId, shopId } = body;

    // Validate required fields
    if (!requestId || !shopId) {
      return NextResponse.json(
        { error: 'Request ID and Shop ID are required' },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(requestId) || !mongoose.Types.ObjectId.isValid(shopId)) {
      return NextResponse.json(
        { error: 'Invalid ID format' },
        { status: 400 }
      );
    }

    // Find the request
    const medicineRequest = await MedicineRequest.findById(requestId);

    if (!medicineRequest) {
      return NextResponse.json(
        { error: 'Medicine request not found' },
        { status: 404 }
      );
    }

    if (medicineRequest.status !== 'pending') {
      return NextResponse.json(
        { error: 'This request has already been fulfilled or cancelled' },
        { status: 400 }
      );
    }

    // Get shop details
    const shop = await User.findById(shopId);
    if (!shop || shop.role !== 'shop') {
      return NextResponse.json(
        { error: 'Invalid shop' },
        { status: 400 }
      );
    }

    // Update the request
    medicineRequest.status = 'fulfilled';
    medicineRequest.fulfilledBy = shopId;
    medicineRequest.fulfilledAt = new Date();
    await medicineRequest.save();

    // Notify the patient who requested
    await Notification.create({
      userId: medicineRequest.requestedBy,
      type: 'medicine-request',
      title: 'Medicine Now Available!',
      message: `Great news! "${medicineRequest.medicineName}" is now available at ${shop.shopName}. Check it out!`,
      read: false,
      relatedRequestId: medicineRequest._id,
    });

    // Notify all other shopkeepers that this request has been fulfilled
    const otherShopkeepers = await User.find({ 
      role: 'shop', 
      _id: { $ne: shopId } 
    }).select('_id');

    const notifications = otherShopkeepers.map((s) => ({
      userId: s._id,
      type: 'medicine-request',
      title: 'Request Fulfilled',
      message: `The request for "${medicineRequest.medicineName}" has been fulfilled by another shop.`,
      read: false,
      relatedRequestId: medicineRequest._id,
    }));

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }

    return NextResponse.json(
      {
        message: 'Medicine request fulfilled successfully',
        request: medicineRequest,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Fulfill medicine request error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
