import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

interface Body {
  input?: string;
}

export async function POST(req: Request) {
  const { input }: Body = await req.json();
  if (!input) return NextResponse.json([], { status: 400 });

  const sessiontoken = uuidv4();
  const body = {
    input,
    includedPrimaryTypes: ['locality'], // filters for cities
  };

  const resp = await fetch(
    'https://places.googleapis.com/v1/places:autocomplete',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': process.env.MAPS_API_KEY || '',
      },
      body: JSON.stringify(body),
    }
  );

  const data = await resp.json();
  return NextResponse.json(data.suggestions ?? [], {
    status: resp.ok ? 200 : resp.status,
  });
}
