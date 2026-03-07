import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Prescription from '@/models/Prescription';
import PrescriptionOffer from '@/models/PrescriptionOffer';
import mongoose from 'mongoose';

// GET - Fetch all pending prescriptions for shops to review
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

    // Get all prescriptions that are pending or have offers
    const prescriptions = await Prescription.find({
      status: { $in: ['pending', 'offers-received'] }
    })
      .populate('patientId', 'name email')
      .sort({ createdAt: -1 });

    // Check which ones this shop has already sent offers for
    const shopOffers = await PrescriptionOffer.find({ shopId });
    const offeredPrescriptionIds = new Set(
      shopOffers.map((o) => o.prescriptionId.toString())
    );

    const prescriptionsWithStatus = prescriptions.map((p) => ({
      ...p.toObject(),
      hasSubmittedOffer: offeredPrescriptionIds.has(p._id.toString()),
      myOffer: shopOffers.find(
        (o) => o.prescriptionId.toString() === p._id.toString()
      ),
    }));

    return NextResponse.json(
      {
        prescriptions: prescriptionsWithStatus,
        count: prescriptions.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get prescriptions for shop error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
