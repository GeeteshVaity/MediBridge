import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Cart from '@/models/Cart';
import mongoose from 'mongoose';

// Get cart
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

    let cart = await Cart.findOne({ patientId });

    if (!cart) {
      cart = await Cart.create({ patientId, items: [] });
    }

    return NextResponse.json(
      {
        cart: {
          id: cart._id,
          items: cart.items,
          itemCount: cart.items.length,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get cart error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Add/Update item in cart
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { patientId, medicineName, quantity, shopId, medicineId, price, brand, inventoryId } = body;

    if (!patientId || !medicineName || !quantity) {
      return NextResponse.json(
        { error: 'patientId, medicineName, and quantity are required' },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(patientId)) {
      return NextResponse.json(
        { error: 'Invalid patientId format' },
        { status: 400 }
      );
    }

    if (quantity < 1) {
      return NextResponse.json(
        { error: 'Quantity must be at least 1' },
        { status: 400 }
      );
    }

    // Find or create cart
    let cart = await Cart.findOne({ patientId });

    if (!cart) {
      cart = new Cart({ patientId, items: [] });
    }

    // Check if item already exists
    const existingItemIndex = cart.items.findIndex(
      (item) => item.medicineName === medicineName
    );

    if (existingItemIndex > -1) {
      // Update existing item quantity
      cart.items[existingItemIndex].quantity += quantity;
    } else {
      // Add new item
      cart.items.push({
        medicineName,
        quantity,
        ...(medicineId && { medicineId }),
        ...(shopId && { shopId }),
        ...(price !== undefined && { price }),
        ...(brand && { brand }),
        ...(inventoryId && { inventoryId }),
      });
    }

    await cart.save();

    return NextResponse.json(
      {
        message: 'Cart updated',
        cart: {
          id: cart._id,
          items: cart.items,
          itemCount: cart.items.length,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Update cart error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Update item quantity in cart
export async function PUT(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { patientId, itemId, medicineName, quantity } = body;

    if (!patientId || (!itemId && !medicineName) || quantity === undefined) {
      return NextResponse.json(
        { error: 'patientId, itemId/medicineName, and quantity are required' },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(patientId)) {
      return NextResponse.json(
        { error: 'Invalid patientId format' },
        { status: 400 }
      );
    }

    if (quantity < 1) {
      return NextResponse.json(
        { error: 'Quantity must be at least 1' },
        { status: 400 }
      );
    }

    const cart = await Cart.findOne({ patientId });

    if (!cart) {
      return NextResponse.json(
        { error: 'Cart not found' },
        { status: 404 }
      );
    }

    // Find item by itemId (inventoryId) or medicineName
    const itemIndex = cart.items.findIndex(
      (item) => item.inventoryId === itemId || item.medicineName === medicineName
    );

    if (itemIndex === -1) {
      return NextResponse.json(
        { error: 'Item not found in cart' },
        { status: 404 }
      );
    }

    cart.items[itemIndex].quantity = quantity;
    await cart.save();

    return NextResponse.json(
      {
        message: 'Cart updated',
        cart: {
          id: cart._id,
          items: cart.items,
          itemCount: cart.items.length,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Update cart quantity error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Remove item from cart
export async function DELETE(request: NextRequest) {
  try {
    await connectDB();

    // Try to get params from body first, then fall back to query params
    let patientId: string | null = null;
    let itemId: string | null = null;
    let medicineName: string | null = null;

    try {
      const body = await request.json();
      patientId = body.patientId;
      itemId = body.itemId;
      medicineName = body.medicineName;
    } catch {
      // If body parsing fails, try query params
      const { searchParams } = new URL(request.url);
      patientId = searchParams.get('patientId');
      medicineName = searchParams.get('medicineName');
    }

    if (!patientId || (!itemId && !medicineName)) {
      return NextResponse.json(
        { error: 'patientId and itemId/medicineName are required' },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(patientId)) {
      return NextResponse.json(
        { error: 'Invalid patientId format' },
        { status: 400 }
      );
    }

    // Build the pull condition based on what identifier we have
    const pullCondition: any = {};
    if (itemId) {
      pullCondition.inventoryId = itemId;
    }
    if (medicineName) {
      pullCondition.medicineName = medicineName;
    }

    const cart = await Cart.findOneAndUpdate(
      { patientId },
      { $pull: { items: pullCondition } },
      { new: true }
    );

    if (!cart) {
      return NextResponse.json(
        { error: 'Cart not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        message: 'Item removed from cart',
        cart: {
          id: cart._id,
          items: cart.items,
          itemCount: cart.items.length,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Remove from cart error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
