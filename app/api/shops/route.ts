import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';

// Helper function to calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const maxDistance = parseFloat(searchParams.get('maxDistance') || '10'); // Default 10km

    // Build query for shops only
    const query: Record<string, unknown> = { role: 'shop' };

    // Optional search by shop name or address
    if (search) {
      query.$or = [
        { shopName: { $regex: search, $options: 'i' } },
        { shopAddress: { $regex: search, $options: 'i' } },
      ];
    }

    let shops;

    // If coordinates are provided, use geospatial query
    if (lat && lng) {
      const userLat = parseFloat(lat);
      const userLng = parseFloat(lng);

      // Find shops with location within maxDistance
      shops = await User.find({
        ...query,
        location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [userLng, userLat],
            },
            $maxDistance: maxDistance * 1000, // Convert km to meters
          },
        },
      }).select('name email shopName shopAddress location phone createdAt');

      // Calculate distance for each shop
      const shopsWithDistance = shops.map((shop) => {
        const shopLat = shop.location?.coordinates?.[1];
        const shopLng = shop.location?.coordinates?.[0];
        let distance = null;
        
        if (shopLat && shopLng) {
          distance = calculateDistance(userLat, userLng, shopLat, shopLng);
        }

        return {
          id: shop._id,
          name: shop.name,
          email: shop.email,
          shopName: shop.shopName,
          shopAddress: shop.shopAddress,
          phone: shop.phone,
          location: shop.location?.coordinates
            ? {
                lat: shop.location.coordinates[1],
                lng: shop.location.coordinates[0],
              }
            : null,
          distance: distance ? `${distance.toFixed(1)} km` : null,
          distanceValue: distance,
        };
      });

      return NextResponse.json(
        {
          shops: shopsWithDistance,
          count: shopsWithDistance.length,
        },
        { status: 200 }
      );
    }

    // Without coordinates, return all shops sorted by name
    shops = await User.find(query)
      .select('name email shopName shopAddress location phone createdAt')
      .sort({ shopName: 1 });

    return NextResponse.json(
      {
        shops: shops.map((shop) => ({
          id: shop._id,
          name: shop.name,
          email: shop.email,
          shopName: shop.shopName,
          shopAddress: shop.shopAddress,
          phone: shop.phone,
          location: shop.location?.coordinates
            ? {
                lat: shop.location.coordinates[1],
                lng: shop.location.coordinates[0],
              }
            : null,
        })),
        count: shops.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get shops error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
