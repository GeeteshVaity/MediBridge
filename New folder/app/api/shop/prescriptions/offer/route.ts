import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Prescription from '@/models/Prescription';
import PrescriptionOffer from '@/models/PrescriptionOffer';
import Notification from '@/models/Notification';
import User from '@/models/User';
import mongoose from 'mongoose';

// POST - Submit a medicine offer for a prescription
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { prescriptionId, shopId, medicines, deliveryFee, notes } = body;

    // Validate required fields
    if (!prescriptionId || !shopId || !medicines || medicines.length === 0) {
      return NextResponse.json(
        { error: 'prescriptionId, shopId, and medicines are required' },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(prescriptionId) || !mongoose.Types.ObjectId.isValid(shopId)) {
      return NextResponse.json(
        { error: 'Invalid ID format' },
        { status: 400 }
      );
    }

    // Get prescription
    const prescription = await Prescription.findById(prescriptionId);
    if (!prescription) {
      return NextResponse.json(
        { error: 'Prescription not found' },
        { status: 404 }
      );
    }

    if (prescription.status === 'accepted' || prescription.status === 'completed') {
      return NextResponse.json(
        { error: 'This prescription has already been accepted' },
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

    // Check if shop already submitted an offer
    const existingOffer = await PrescriptionOffer.findOne({ prescriptionId, shopId });
    if (existingOffer) {
      return NextResponse.json(
        { error: 'You have already submitted an offer for this prescription' },
        { status: 409 }
      );
    }

    // Calculate total amount
    const totalAmount = medicines.reduce(
      (sum: number, m: any) => sum + (m.price * m.quantity),
      0
    );

    // Create the offer
    const offer = await PrescriptionOffer.create({
      prescriptionId,
      shopId,
      shopName: shop.shopName || shop.name,
      medicines,
      totalAmount,
      deliveryFee: deliveryFee || 0,
      notes,
      status: 'pending',
    });

    // Update prescription status
    if (prescription.status === 'pending') {
      prescription.status = 'offers-received';
      await prescription.save();
    }

    // Notify the patient
    await Notification.create({
      userId: prescription.patientId,
      type: 'order',
      title: 'New Offer Received',
      message: `${shop.shopName || shop.name} has sent you a medicine offer for ₹${(totalAmount + (deliveryFee || 0)).toFixed(2)}`,
      read: false,
    });

    return NextResponse.json(
      {
        message: 'Offer submitted successfully',
        offer,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Submit offer error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
