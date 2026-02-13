import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get('key');
    const email = searchParams.get('email');

    if (!key) {
      return NextResponse.json({ error: 'Key is required' }, { status: 400 });
    }

    const response = await axios.get('https://likesff.online/api/PASS', {
      params: {
        mode: 'info',
        key,
        email
      }
    });

    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('[PROXY] Error fetching LikesFF info:', error.message);
    return NextResponse.json({ error: 'Failed to fetch from LikesFF' }, { status: 500 });
  }
}
