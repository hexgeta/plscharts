import { NextResponse } from 'next/server';
import { isEmailWhitelisted } from '@/config/whitelisted-handles';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const isWhitelisted = isEmailWhitelisted(email);
    
    return NextResponse.json({ isWhitelisted });
  } catch (error) {
    console.error('Error checking whitelist:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 