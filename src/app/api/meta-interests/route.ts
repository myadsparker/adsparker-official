import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Comprehensive list of interest names to search
const INTEREST_NAMES = [
  // Business & Finance
  'Advertising',
  'Agriculture',
  'Architecture',
  'Aviation',
  'Banking',
  'Investment banking',
  'Online banking',
  'Retail banking',
  'Business',
  'Construction',
  'Design',
  'Fashion design',
  'Graphic design',
  'Interior design',
  'Economics',
  'Engineering',
  'Entrepreneurship',
  'Health care',
  'Higher education',
  'Management',
  'Marketing',
  'Nursing',
  'Online',
  'Digital marketing',
  'Display advertising',
  'Email marketing',
  'Online advertising',
  'Search engine optimization',
  'Social media',
  'Social media marketing',
  'Web design',
  'Web development',
  'Web hosting',
  'Personal finance',
  'Creditcards',
  'Insurance',
  'Investment',
  'Mortgage loans',
  'Real estate',
  'Retail',
  'Sales',
  'Science',
  'Small business',

  // Entertainment - Games
  'Action games',
  'Board games',
  'Browser games',
  'Card games',
  'Casino games',
  'First-person shooter games',
  'Gambling',
  'Massively multiplayer online games',
  'Massively multiplayer online role-playing games',
  'Online games',
  'Online poker',
  'Puzzle video games',
  'Racing games',
  'Role-playing games',
  'Shooter games',
  'Simulation games',
  'Sports games',
  'Strategy games',
  'Video games',
  'Word games',

  // Entertainment - Live events
  'Ballet',
  'Bars',
  'Concerts',
  'Dancehalls',
  'Music festivals',
  'Nightclubs',
  'Parties',
  'Plays',
  'Theatre',

  // Entertainment - Movies
  'Action movies',
  'Animated movies',
  'Anime movies',
  'Bollywood movies',
  'Comedy movies',
  'Documentary movies',
  'Drama movies',
  'Fantasy movies',
  'Horror movies',
  'Musical theatre',
  'Science fiction movies',
  'Thriller movies',

  // Entertainment - Music
  'Blues music',
  'Classical music',
  'Country music',
  'Dance music',
  'Electronic music',
  'Gospel music',
  'Heavy metal music',
  'Hip hop music',
  'Jazz music',
  'Music videos',
  'Pop music',
  'Rhythm and blues music',
  'Rock music',
  'Soul music',

  // Entertainment - Reading
  'Books',
  'Comics',
  'E-books',
  'Fiction books',
  'Literature',
  'Magazines',
  'Manga',
  'Mystery fiction',
  'Newspapers',
  'Non-fiction books',
  'Romance novels',

  // Entertainment - TV
  'TV comedies',
  'TV game shows',
  'TV reality shows',
  'TV talkshows',

  // Family and relationships
  'Dating',
  'Family',
  'Fatherhood',
  'Friendship',
  'Marriage',
  'Motherhood',
  'Parenting',
  'Weddings',

  // Fitness and wellness
  'Bodybuilding',
  'Meditation',
  'Physical exercise',
  'Physical fitness',
  'Running',
  'Weight training',
  'Yoga',

  // Food and drink - Alcoholic beverages
  'Beer',
  'Distilled beverage',
  'Wine',

  // Food and drink - Beverages
  'Coffee',
  'Energy drinks',
  'Juice',
  'Soft drinks',
  'Tea',

  // Food and drink - Cooking
  'Baking',
  'Recipes',

  // Food and drink - Cuisine
  'Chinese cuisine',
  'French cuisine',
  'German cuisine',
  'Greek cuisine',
  'Indian cuisine',
  'Italian cuisine',
  'Japanese cuisine',
  'Korean cuisine',
  'Latin American cuisine',
  'Mexican cuisine',
  'Middle Eastern cuisine',
  'Spanish cuisine',
  'Thai cuisine',
  'Vietnamese cuisine',

  // Food and drink - Food
  'Barbecue',
  'Chocolate',
  'Desserts',
  'Fast food',
  'Organic food',
  'Pizza',
  'Seafood',
  'Veganism',
  'Vegetarianism',

  // Food and drink - Restaurants
  'Coffeehouses',
  'Diners',
  'Fast casual restaurants',
  'Fast food restaurants',

  // Hobbies and activities - Arts and music
  'Acting',
  'Crafts',
  'Dance',
  'Drawing',
  'Drums',
  'Fine art',
  'Guitar',
  'Painting',
  'Performing arts',
  'Photography',
  'Sculpture',
  'Singing',
  'Writing',

  // Hobbies and activities - Current events
  'Current events',

  // Hobbies and activities - Home and garden
  'Do it yourself (DIY)',
  'Furniture',
  'Gardening',
  'Home Appliances',
  'Home improvement',

  // Hobbies and activities - Pets
  'Birds',
  'Cats',
  'Dogs',
  'Fish',
  'Horses',
  'Pet food',
  'Rabbits',
  'Reptiles',

  // Hobbies and activities - Politics and social issues
  'Charity and causes',
  'Community issues',
  'Environmentalism',
  'Law',
  'Military',
  'Politics',
  'Religion',
  'Sustainability',
  'Veterans',
  'Volunteering',

  // Hobbies and activities - Travel
  'Adventure travel',
  'Air travel',
  'Beaches',
  'Car rentals',
  'Cruises',
  'Ecotourism',
  'Hotels',
  'Lakes',
  'Mountains',
  'Nature',
  'Theme parks',
  'Tourism',
  'Vacations',

  // Hobbies and activities - Vehicles
  'Automobiles',
  'Boats',
  'Electric vehicle',
  'Hybrids',
  'Minivans',
  'Motorcycles',
  'RVs',
  'SUVs',
  'Scooters',
  'Trucks',

  // Shopping and fashion - Beauty
  'Beauty salons',
  'Cosmetics',
  'Fragrances',
  'Hair products',
  'Spas',
  'Tattoos',

  // Shopping and fashion - Clothing
  "Children's clothing",
  "Men's clothing",
  'Shoes',
  "Women's clothing",

  // Shopping and fashion - Fashion accessories
  'Dresses',
  'Handbags',
  'Jewelry',
  'Sunglasses',

  // Shopping and fashion - Shopping
  'Boutiques',
  'Coupons',
  'Discount stores',
  'Luxury goods',
  'Online shopping',
  'Shopping malls',

  // Shopping and fashion - Toys
  'Toys',

  // Sports and outdoors - Outdoor recreation
  'Boating',
  'Camping',
  'Fishing',
  'Horseback riding',
  'Hunting',
  'Mountain biking',
  'Surfing',

  // Sports and outdoors - Sports
  'American football',
  'Association football (Soccer)',
  'Auto racing',
  'Baseball',
  'Basketball',
  'College football',
  'Golf',
  'Marathons',
  'Skiing',
  'Snowboarding',
  'Swimming',
  'Tennis',
  'Thriathlons',
  'Volleyball',

  // Technology - Computers
  'Computer memory',
  'Computer monitors',
  'Computer processors',
  'Computer servers',
  'Desktop computers',
  'Free software',
  'Hard drives',
  'Network storage',
  'Software',
  'Tablet computers',

  // Technology - Consumer electronics
  'Audio equipment',
  'Camcorders',
  'Cameras',
  'E-book readers',
  'GPS devices',
  'Game consoles',
  'Mobile phones',
  'Portable media players',
  'Projectors',
  'Smartphones',
  'Televisions',
];

// Helper function to search Meta ad interests
async function searchMetaInterest(interestName: string): Promise<any[]> {
  const url = `https://graph.facebook.com/v21.0/search?type=adinterest&q=${encodeURIComponent(
    interestName
  )}&locale=en_US&limit=1000&access_token=${process.env.META_AD_ACCESS_TOKEN}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text();
      console.warn(
        `Meta interest search failed for "${interestName}":`,
        res.status,
        text
      );
      return [];
    }

    const json = await res.json();
    return json.data || [];
  } catch (error) {
    console.error(`Error searching for "${interestName}":`, error);
    return [];
  }
}

// Helper function to save interests to database
async function saveInterestsToDatabase(interests: any[]): Promise<void> {
  if (interests.length === 0) return;

  // Prepare data for insertion (only id and name)
  const interestsToInsert = interests.map(interest => ({
    id: interest.id,
    name: interest.name,
  }));

  try {
    // Insert interests, ignoring duplicates
    const { error } = await supabase
      .from('meta_ad_interests')
      .upsert(interestsToInsert, {
        onConflict: 'id',
        ignoreDuplicates: true,
      });

    if (error) {
      console.error('Error saving interests to database:', error);
      throw error;
    }

    console.log(`✅ Saved ${interestsToInsert.length} interests to database`);
  } catch (error) {
    console.error('Database save error:', error);
    throw error;
  }
}

// Helper function to add delay between requests
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function POST(request: Request) {
  try {
    console.log('🚀 Starting Meta ad interests collection...');

    const results = {
      totalSearched: 0,
      totalFound: 0,
      totalSaved: 0,
      errors: [] as string[],
      processedInterests: [] as string[],
    };

    // Process each interest name
    for (let i = 0; i < INTEREST_NAMES.length; i++) {
      const interestName = INTEREST_NAMES[i];
      console.log(
        `🔍 Processing ${i + 1}/${INTEREST_NAMES.length}: "${interestName}"`
      );

      try {
        // Search Meta for this interest
        const interests = await searchMetaInterest(interestName);
        results.totalSearched++;
        results.totalFound += interests.length;
        results.processedInterests.push(interestName);

        console.log(
          `📊 Found ${interests.length} interests for "${interestName}"`
        );

        // Save to database
        if (interests.length > 0) {
          await saveInterestsToDatabase(interests);
          results.totalSaved += interests.length;
        }

        // Add delay between requests to avoid rate limiting
        await delay(200);
      } catch (error) {
        const errorMsg = `Error processing "${interestName}": ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(errorMsg);
        results.errors.push(errorMsg);
      }
    }

    console.log('✅ Meta ad interests collection completed');
    console.log(
      `📊 Summary: ${results.totalSearched} searched, ${results.totalFound} found, ${results.totalSaved} saved`
    );

    return NextResponse.json({
      success: true,
      message: 'Meta ad interests collection completed',
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Meta ad interests collection failed:', error);
    return NextResponse.json(
      {
        error: 'Failed to collect Meta ad interests',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check current database status
export async function GET() {
  try {
    const { data: interests, error } = await supabase
      .from('meta_ad_interests')
      .select('id, name')
      .order('name');

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      count: interests?.length || 0,
      interests: interests || [],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Failed to fetch Meta ad interests:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch Meta ad interests',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
