import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Prescription from '@/models/Prescription';
import PrescriptionOffer from '@/models/PrescriptionOffer';
import mongoose from 'mongoose';

// GET - Fetch all prescriptions for shops to review (including their submitted offers)
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

    // Get all offers submitted by this shop
    const shopOffers = await PrescriptionOffer.find({ shopId });
    const offeredPrescriptionIds = shopOffers.map((o) => o.prescriptionId);

    // Get prescriptions that are:
    // 1. Pending/offers-received (available for new offers), OR
    // 2. Already have an offer from this shop (to show offer status)
    const prescriptions = await Prescription.find({
      $or: [
        { status: { $in: ['pending', 'offers-received'] } },
        { _id: { $in: offeredPrescriptionIds } }
      ]
    })
      .populate('patientId', 'name email')
      .sort({ createdAt: -1 });

    const offeredPrescriptionIdsSet = new Set(
      shopOffers.map((o) => o.prescriptionId.toString())
    );

    const prescriptionsWithStatus = prescriptions.map((p) => ({
      ...p.toObject(),
      hasSubmittedOffer: offeredPrescriptionIdsSet.has(p._id.toString()),
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
