import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Inventory from '@/models/Inventory';
import mongoose from 'mongoose';

export async function PUT(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { inventoryId, medicineName, quantity, expiryDate } = body;

    // Validate required fields
    if (!inventoryId) {
      return NextResponse.json(
        { error: 'inventoryId is required' },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(inventoryId)) {
      return NextResponse.json(
        { error: 'Invalid inventoryId format' },
        { status: 400 }
      );
    }

    // Build update object
    const updateFields: Record<string, unknown> = {};
    if (medicineName !== undefined) updateFields.medicineName = medicineName.trim();
    if (quantity !== undefined) {
      if (typeof quantity !== 'number' || quantity < 0) {
        return NextResponse.json(
          { error: 'Quantity must be a non-negative number' },
          { status: 400 }
        );
      }
      updateFields.quantity = quantity;
    }
    if (expiryDate !== undefined) {
      if (expiryDate && isNaN(Date.parse(expiryDate))) {
        return NextResponse.json(
          { error: 'Invalid expiryDate format' },
          { status: 400 }
        );
      }
      updateFields.expiryDate = expiryDate ? new Date(expiryDate) : null;
    }

    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    const updatedInventory = await Inventory.findByIdAndUpdate(
      inventoryId,
      { $set: updateFields },
      { new: true }
    );

    if (!updatedInventory) {
      return NextResponse.json(
        { error: 'Inventory item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        message: 'Inventory updated successfully',
        inventory: updatedInventory,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Update inventory error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const inventoryId = searchParams.get('inventoryId');

    if (!inventoryId) {
      return NextResponse.json(
        { error: 'inventoryId query parameter is required' },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(inventoryId)) {
      return NextResponse.json(
        { error: 'Invalid inventoryId format' },
        { status: 400 }
      );
    }

    const deletedInventory = await Inventory.findByIdAndDelete(inventoryId);

    if (!deletedInventory) {
      return NextResponse.json(
        { error: 'Inventory item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: 'Inventory item deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Delete inventory error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
