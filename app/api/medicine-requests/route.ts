import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import MedicineRequest from '@/models/MedicineRequest';
import Notification from '@/models/Notification';
import User from '@/models/User';
import mongoose from 'mongoose';

// GET - Fetch all pending medicine requests (for shopkeepers)
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';

    const requests = await MedicineRequest.find({ status })
      .populate('requestedBy', 'name email')
      .populate('fulfilledBy', 'name shopName')
      .sort({ createdAt: -1 });

    return NextResponse.json(
      { requests, count: requests.length },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get medicine requests error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create a new medicine request (for patients)
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { medicineName, patientId, patientName } = body;

    // Validate required fields
    if (!medicineName || !patientId || !patientName) {
      return NextResponse.json(
        { error: 'Medicine name, patient ID, and patient name are required' },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(patientId)) {
      return NextResponse.json(
        { error: 'Invalid patient ID format' },
        { status: 400 }
      );
    }

    // Check if there's already a pending request for this medicine
    const existingRequest = await MedicineRequest.findOne({
      medicineName: { $regex: new RegExp(`^${medicineName}$`, 'i') },
      status: 'pending',
    });

    if (existingRequest) {
      return NextResponse.json(
        { error: 'A request for this medicine is already pending', existingRequest },
        { status: 409 }
      );
    }

    // Create the medicine request
    const medicineRequest = await MedicineRequest.create({
      medicineName,
      requestedBy: patientId,
      patientName,
      status: 'pending',
    });

    // Send notifications to all shopkeepers
    const shopkeepers = await User.find({ role: 'shop' }).select('_id');
    
    const notifications = shopkeepers.map((shop) => ({
      userId: shop._id,
      type: 'medicine-request',
      title: 'New Medicine Request',
      message: `${patientName} is looking for "${medicineName}". Consider stocking this medicine.`,
      read: false,
      relatedRequestId: medicineRequest._id,
    }));

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }

    return NextResponse.json(
      {
        message: 'Medicine request submitted successfully',
        request: medicineRequest,
        notifiedShops: shopkeepers.length,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create medicine request error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
