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
    offer.status = 'accepted';
    await offer.save();

    // Update prescription status
    prescription.status = 'accepted';
    prescription.acceptedOfferId = offer._id;
    await prescription.save();

    // Reject all other offers for this prescription
    await PrescriptionOffer.updateMany(
      { 
        prescriptionId: prescription._id, 
        _id: { $ne: offerId },
        status: 'pending'
      },
      { status: 'rejected' }
    );

    // Notify the shop
    await Notification.create({
      userId: offer.shopId,
      type: 'order',
      title: 'Offer Accepted!',
      message: `Your offer for prescription has been accepted. Order total: ₹${(offer.totalAmount + offer.deliveryFee).toFixed(2)}`,
      read: false,
    });

    // Notify rejected shops
    const rejectedOffers = await PrescriptionOffer.find({
      prescriptionId: prescription._id,
      _id: { $ne: offerId },
    });

    const rejectionNotifications = rejectedOffers.map((o) => ({
      userId: o.shopId,
      type: 'order',
      title: 'Offer Not Selected',
      message: `Another shop's offer was selected for prescription #${prescription._id.toString().slice(-6).toUpperCase()}`,
      read: false,
    }));

    if (rejectionNotifications.length > 0) {
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
