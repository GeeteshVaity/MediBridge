import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Prescription from '@/models/Prescription';
import PrescriptionOffer from '@/models/PrescriptionOffer';
import Order from '@/models/Order';
import Notification from '@/models/Notification';
import mongoose from 'mongoose';

// POST - Accept an offer and create an order
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { offerId, patientId } = body;

    // Validate required fields
    if (!offerId || !patientId) {
      return NextResponse.json(
        { error: 'offerId and patientId are required' },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(offerId) || !mongoose.Types.ObjectId.isValid(patientId)) {
      return NextResponse.json(
        { error: 'Invalid ID format' },
        { status: 400 }
      );
    }

    // Get the offer
    const offer = await PrescriptionOffer.findById(offerId);
    if (!offer) {
      return NextResponse.json(
        { error: 'Offer not found' },
        { status: 404 }
      );
    }

    if (offer.status !== 'pending') {
      return NextResponse.json(
        { error: 'This offer is no longer available' },
        { status: 400 }
      );
    }

    // Get the prescription
    const prescription = await Prescription.findById(offer.prescriptionId);
    if (!prescription) {
      return NextResponse.json(
        { error: 'Prescription not found' },
        { status: 404 }
      );
    }

    // Verify the patient owns this prescription
    if (prescription.patientId.toString() !== patientId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    if (prescription.status === 'accepted' || prescription.status === 'completed') {
      return NextResponse.json(
        { error: 'This prescription has already been processed' },
        { status: 400 }
      );
    }

    // Create the order
    const order = await Order.create({
      patientId,
      medicines: offer.medicines.map((m) => ({
        medicineName: m.medicineName,
        brand: m.brand,
        quantity: m.quantity,
        price: m.price,
      })),
      status: 'accepted',
      acceptedBy: offer.shopId,
      prescriptionId: prescription._id,
    });

    // Update the offer status
    await PrescriptionOffer.findByIdAndUpdate(offerId, { status: 'accepted' });

    // Update prescription status using findByIdAndUpdate to avoid validation issues
    await Prescription.findByIdAndUpdate(
      prescription._id,
      { 
        status: 'accepted',
        acceptedOfferId: offer._id 
      }
    );

    // Reject all other offers for this prescription
    const rejectedOffers = await PrescriptionOffer.find({
      prescriptionId: prescription._id,
      _id: { $ne: offerId },
      status: 'pending'
    });

    await PrescriptionOffer.updateMany(
      { 
        prescriptionId: prescription._id, 
        _id: { $ne: offerId },
        status: 'pending'
      },
      { status: 'rejected' }
    );

    const prescriptionCode = `RX-${prescription._id.toString().slice(-6).toUpperCase()}`;

    // Notify the accepted shop
    await Notification.create({
      userId: offer.shopId,
      type: 'prescription',
      title: '🎉 Offer Accepted!',
      message: `Great news! Your offer of ₹${(offer.totalAmount + offer.deliveryFee).toFixed(2)} for prescription ${prescriptionCode} has been accepted by the patient. Please prepare the order.`,
      read: false,
      relatedPrescriptionId: prescription._id,
    });

    // Notify rejected shops with detailed messages
    if (rejectedOffers.length > 0) {
      const rejectionNotifications = rejectedOffers.map((o) => ({
        userId: o.shopId,
        type: 'prescription',
        title: 'Offer Not Selected',
        message: `The patient has selected another offer for prescription ${prescriptionCode}. Your offer of ₹${(o.totalAmount + o.deliveryFee).toFixed(2)} was not selected this time.`,
        read: false,
        relatedPrescriptionId: prescription._id,
      }));

      await Notification.insertMany(rejectionNotifications);
    }

    return NextResponse.json(
      {
        message: 'Offer accepted and order created successfully',
        order,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Accept offer error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
