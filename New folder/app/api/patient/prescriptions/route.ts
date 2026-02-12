import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Prescription from '@/models/Prescription';
import mongoose from 'mongoose';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { patientId, imageUrl, notes } = body;

    if (!patientId || !imageUrl) {
      return NextResponse.json(
        { error: 'patientId and imageUrl are required' },
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
      imageUrl,
      ...(notes && { notes: notes.trim() }),
    });

    return NextResponse.json(
      {
        message: 'Prescription uploaded successfully',
        prescription: {
          id: prescription._id,
          patientId: prescription.patientId,
          imageUrl: prescription.imageUrl,
          notes: prescription.notes,
          status: prescription.status,
          createdAt: prescription.createdAt,
        },
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

    return NextResponse.json(
      {
        prescriptions,
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
