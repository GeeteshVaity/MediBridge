import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { getUserFromToken } from '@/lib/auth-middleware';
import User from '@/models/User';

// GET - Get shop location
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const user = getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'shop') {
      return NextResponse.json(
        { error: 'Only shop owners can access this endpoint' },
        { status: 403 }
      );
    }

    const shop = await User.findById(user.userId).select('location shopName shopAddress phone');

    if (!shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
    }

    return NextResponse.json({
      location: shop.location?.coordinates
        ? {
            lat: shop.location.coordinates[1],
            lng: shop.location.coordinates[0],
          }
        : null,
      shopName: shop.shopName,
      shopAddress: shop.shopAddress,
      phone: shop.phone,
    });
  } catch (error) {
    console.error('Get shop location error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update shop location
export async function PUT(request: NextRequest) {
  try {
    await connectDB();

    const user = getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'shop') {
      return NextResponse.json(
        { error: 'Only shop owners can update location' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { lat, lng, shopAddress, phone } = body;

    if (lat === undefined || lng === undefined) {
      return NextResponse.json(
        { error: 'Latitude and longitude are required' },
        { status: 400 }
      );
    }

    // Validate coordinates
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return NextResponse.json(
        { error: 'Invalid coordinates' },
        { status: 400 }
      );
    }

    // Use $set with dot notation for nested GeoJSON location to avoid Mongoose type conflicts
    const updateData: Record<string, unknown> = {
      'location.type': 'Point',
      'location.coordinates': [lng, lat], // GeoJSON format: [longitude, latitude]
    };

    if (shopAddress) {
      updateData.shopAddress = shopAddress;
    }

    if (phone) {
      updateData.phone = phone;
    }

    const updatedShop = await User.findByIdAndUpdate(
      user.userId,
      { $set: updateData },
      { new: true }
    ).select('location shopName shopAddress phone');

    if (!updatedShop || !updatedShop.location?.coordinates) {
      return NextResponse.json({ error: 'Failed to update location' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Location updated successfully',
      location: {
        lat: updatedShop.location.coordinates[1],
        lng: updatedShop.location.coordinates[0],
      },
      shopAddress: updatedShop.shopAddress,
      phone: updatedShop.phone,
    });
  } catch (error) {
    console.error('Update shop location error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
