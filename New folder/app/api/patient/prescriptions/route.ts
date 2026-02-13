import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Prescription from '@/models/Prescription';
import Notification from '@/models/Notification';
import User from '@/models/User';
import PrescriptionOffer from '@/models/PrescriptionOffer';
import mongoose from 'mongoose';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { patientId, patientName, imageUrl, imageData, notes } = body;

    if (!patientId || !imageUrl || !patientName) {
      return NextResponse.json(
        { error: 'patientId, patientName and imageUrl are required' },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(patientId)) {
      return NextResponse.json(
        { error: 'Invalid patientId format' },
        { status: 400 }
      );
    }

    const prescription = await Prescription.create({
      patientId,
      patientName,
      imageUrl,
      ...(imageData && { imageData }),
      ...(notes && { notes: notes.trim() }),
      status: 'pending',
    });

    // Notify all shopkeepers about the new prescription
    const shopkeepers = await User.find({ role: 'shop' }).select('_id');
    
    const notifications = shopkeepers.map((shop) => ({
      userId: shop._id,
      type: 'order',
      title: 'New Prescription Uploaded',
      message: `${patientName} has uploaded a prescription. Review and send your medicine offer.`,
      read: false,
    }));

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }

    return NextResponse.json(
      {
        message: 'Prescription uploaded and sent to all medical shops',
        prescription: {
          id: prescription._id,
          _id: prescription._id,
          patientId: prescription.patientId,
          patientName: prescription.patientName,
          imageUrl: prescription.imageUrl,
          notes: prescription.notes,
          status: prescription.status,
          createdAt: prescription.createdAt,
        },
        notifiedShops: shopkeepers.length,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Upload prescription error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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

    const prescriptions = await Prescription.find({ patientId }).sort({ createdAt: -1 });

    // Get offers count for each prescription
    const prescriptionsWithOffers = await Promise.all(
      prescriptions.map(async (prescription) => {
        const offersCount = await PrescriptionOffer.countDocuments({ 
          prescriptionId: prescription._id 
        });
        const offers = await PrescriptionOffer.find({ 
          prescriptionId: prescription._id 
        }).sort({ totalAmount: 1 });
        
        return {
          ...prescription.toObject(),
          offersCount,
          offers,
        };
      })
    );

    return NextResponse.json(
      {
        prescriptions: prescriptionsWithOffers,
        count: prescriptions.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get prescriptions error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
