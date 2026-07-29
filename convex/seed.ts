import { internalMutation } from "./_generated/server";

interface SampleEvent {
  title: string;
  description: string;
  category: string;
  tags: string[];
  city: string;
  state: string;
  venue: string;
  address: string;
  capacity: number;
  ticketType: "free" | "paid";
  ticketPrice?: number;
  coverImage: string;
  themeColor: string;
}

// Sample events data with Unsplash images - Nigerian Edition 🇳🇬
const SAMPLE_EVENTS: SampleEvent[] = [
  {
    title: "React 19 Workshop: Master the New Features",
    description: `Join us for an intensive hands-on workshop diving deep into React 19's revolutionary features! 

In this session, you'll learn about:
- The new Actions API and how it simplifies form handling
- Server Components and their impact on performance
- The improved use() hook and its practical applications
- Asset loading improvements for better UX
- Migration strategies from React 18

Whether you're a seasoned React developer or just getting started, this workshop will equip you with the knowledge to build faster, more efficient applications. Bring your laptop and be ready to code!

Light refreshments will be provided. Limited seats available.`,
    category: "tech",
    tags: ["tech", "react", "javascript", "frontend"],
    city: "Lagos",
    state: "Lagos",
    venue: "https://maps.google.com/?q=Co-Creation+Hub+Yaba+Lagos",
    address: "Co-Creation Hub, 777 Adeniran Ogunsanya Street, Surulere, Lagos",
    capacity: 50,
    ticketType: "free",
    coverImage: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=1200&q=80",
    themeColor: "#4c1d95",
  },
  {
    title: "AI & Machine Learning Meetup - Building with LLMs",
    description: `Explore the exciting world of Large Language Models and learn how to integrate them into your applications!

This meetup covers:
- Introduction to LLM APIs (OpenAI, Anthropic, Google)
- Prompt engineering best practices
- Building RAG applications
- Fine-tuning strategies
- Real-world use cases and demos

Network with fellow AI enthusiasts and developers. Q&A session included.

Pizza and drinks provided!`,
    category: "tech",
    tags: ["tech", "ai", "machine-learning", "llm"],
    city: "Abuja",
    state: "FCT",
    venue: "https://maps.google.com/?q=Hub671+Abuja",
    address: "Hub671, 671 Adetokunbo Ademola Crescent, Wuse 2, Abuja",
    capacity: 100,
    ticketType: "free",
    coverImage: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200&q=80",
    themeColor: "#1e3a8a",
  },
  {
    title: "Indie Music Night - Acoustic Sessions",
    description: `An evening of soulful acoustic performances by indie artists from across Nigeria!

Featuring:
- 5 handpicked indie bands
- Unplugged performances
- Open mic session (limited slots)
- Meet & greet with artists

Experience the raw talent of upcoming musicians in an intimate setting. Perfect for music lovers who appreciate authentic, heartfelt performances.

Food and beverages available for purchase at the venue.`,
    category: "music",
    tags: ["music", "indie", "acoustic", "live"],
    city: "Lagos",
    state: "Lagos",
    venue: "https://maps.google.com/?q=Hard+Rock+Cafe+Victoria+Island+Lagos",
    address: "Hard Rock Cafe, 1076 Adetokunbo Ademola Street, Victoria Island, Lagos",
    capacity: 120,
    ticketType: "paid",
    ticketPrice: 5000,
    coverImage: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1200&q=80",
    themeColor: "#831843",
  },
  {
    title: "Startup Networking Breakfast",
    description: `Connect with fellow entrepreneurs, investors, and startup enthusiasts over breakfast!

What to expect:
- Speed networking sessions
- Pitch practice opportunities
- One-on-one mentor meetings
- Funding insights from VCs
- Success stories from local founders

This is your chance to expand your professional network, find potential co-founders, or get valuable feedback on your startup idea.

Continental breakfast included in registration.`,
    category: "business",
    tags: ["business", "networking", "startup", "entrepreneurship"],
    city: "Port Harcourt",
    state: "Rivers",
    venue: "https://maps.google.com/?q=Hotel+Presidential+Port+Harcourt",
    address: "Hotel Presidential, 14 Aba Road, Port Harcourt",
    capacity: 40,
    ticketType: "paid",
    ticketPrice: 3000,
    coverImage: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1200&q=80",
    themeColor: "#065f46",
  },
  {
    title: "Weekend Photography Walk - Lagos Street Stories",
    description: `Capture the vibrant streets of Lagos through your lens!

Join our photography walk covering:
- Lekki Market's bustling stalls
- Hidden architectural gems in Victoria Island
- Street food and portraits
- Golden hour shooting at the Lekki-Ikoyi Link Bridge
- Post-processing tips

Suitable for all skill levels. Bring your camera (phone cameras welcome too!). Our experienced photographer will guide you through composition techniques and storytelling through images.

Suya and zobo stops included along the way!`,
    category: "art",
    tags: ["art", "photography", "culture", "walking-tour"],
    city: "Lagos",
    state: "Lagos",
    venue: "https://maps.google.com/?q=Lekki+Ikoyi+Link+Bridge+Lagos",
    address: "Lekki-Ikoyi Link Bridge Toll Gate, Lekki, Lagos",
    capacity: 25,
    ticketType: "paid",
    ticketPrice: 8000,
    coverImage: "https://images.unsplash.com/photo-1554080353-a576cf803bda?w=1200&q=80",
    themeColor: "#92400e",
  },
  {
    title: "Full Stack Development Bootcamp - Day 1",
    description: `Kickstart your journey to becoming a full-stack developer!

Day 1 covers:
- Setting up your development environment
- Git & GitHub fundamentals
- HTML5 & CSS3 essentials
- Introduction to JavaScript
- Building your first webpage

This is the first session of our 6-week bootcamp series. Perfect for beginners who want to break into tech. No prior coding experience required!

Laptop required. Course materials provided.`,
    category: "education",
    tags: ["education", "coding", "fullstack", "beginner"],
    city: "Abuja",
    state: "FCT",
    venue: "https://maps.google.com/?q=AltSchool+Africa+Abuja",
    address: "AltSchool Africa Hub, 12 Aminu Kano Crescent, Wuse 2, Abuja",
    capacity: 30,
    ticketType: "free",
    coverImage: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200&q=80",
    themeColor: "#7f1d1d",
  },
  {
    title: "Sunday Football Tournament",
    description: `5-a-side football tournament for amateur players!

Tournament details:
- 8 teams competing
- Round-robin + knockout format
- Prizes for top 3 teams
- Best player award
- Free jersey for all participants

Register as a team (5 players + 2 substitutes) or individually (we'll match you with a team).

Referee provided. Water and energy drinks available. Medical support on standby.`,
    category: "sports",
    tags: ["sports", "football", "tournament", "fitness"],
    city: "Port Harcourt",
    state: "Rivers",
    venue: "https://maps.google.com/?q=Adokiye+Amiesimaka+Stadium+Port+Harcourt",
    address: "Adokiye Amiesimaka Stadium, Aba Road, Port Harcourt",
    capacity: 56,
    ticketType: "paid",
    ticketPrice: 3500,
    coverImage: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1200&q=80",
    themeColor: "#065f46",
  },
  {
    title: "Healthy Cooking Workshop - Nigerian Plant-Based Cuisine",
    description: `Learn to create delicious, nutritious plant-based meals with a Nigerian twist!

Workshop includes:
- 5 complete recipes to master (including vegan egusi and jollof)
- Ingredient selection tips at local markets
- Meal prep strategies
- Nutritional balancing
- Recipe booklet to take home

Our chef instructor will guide you through preparing a full plant-based Nigerian meal from appetizer to dessert. All ingredients and cooking equipment provided.

Taste everything you cook! Great for health enthusiasts and curious foodies alike.`,
    category: "food",
    tags: ["food", "cooking", "health", "vegan"],
    city: "Lagos",
    state: "Lagos",
    venue: "https://maps.google.com/?q=The+Yard+Restaurant+Lekki+Lagos",
    address: "The Yard Restaurant, Lekki Phase 1, Lagos",
    capacity: 20,
    ticketType: "paid",
    ticketPrice: 12000,
    coverImage: "https://images.unsplash.com/photo-1466637574441-749b8f19452f?w=1200&q=80",
    themeColor: "#065f46",
  },
  {
    title: "Morning Yoga & Meditation Retreat",
    description: `Start your weekend with peace and mindfulness!

Session includes:
- 60-minute Hatha Yoga practice
- 30-minute guided meditation
- Breathing techniques (Pranayama)
- Sound healing session
- Healthy breakfast

Suitable for all levels - modifications provided for beginners. Our certified instructor creates a welcoming space for everyone.

Yoga mats provided. Please wear comfortable clothing.`,
    category: "health",
    tags: ["health", "yoga", "meditation", "wellness"],
    city: "Abuja",
    state: "FCT",
    venue: "https://maps.google.com/?q=Millennium+Park+Abuja",
    address: "Millennium Park, Maitama, Abuja",
    capacity: 35,
    ticketType: "paid",
    ticketPrice: 4500,
    coverImage: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=1200&q=80",
    themeColor: "#4c1d95",
  },
  {
    title: "Gaming Tournament - Valorant Championship",
    description: `Compete in the ultimate Valorant showdown!

Tournament format:
- 16 teams (5v5)
- Single elimination bracket
- Best of 3 matches
- Prize pool: ₦500,000
- Live streaming on Twitch

All skill levels welcome. Bring your own peripherals (mouse, headset). High-spec PCs and stable internet provided.

Energy drinks and snacks available. Exciting commentary and crowd interaction!`,
    category: "gaming",
    tags: ["gaming", "esports", "valorant", "tournament"],
    city: "Lagos",
    state: "Lagos",
    venue: "https://maps.google.com/?q=Genesys+Tech+Hub+Ikeja+Lagos",
    address: "Genesys Tech Hub, Ikeja, Lagos",
    capacity: 80,
    ticketType: "paid",
    ticketPrice: 2000,
    coverImage: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&q=80",
    themeColor: "#7f1d1d",
  },
  {
    title: "Women in Tech: Leadership Panel Discussion",
    description: `Inspiring stories and insights from women leaders in Nigeria's tech ecosystem!

Panel features:
- CTOs from top Nigerian startups
- Engineering managers from global tech companies
- Successful tech entrepreneurs
- VC partners focusing on women-led startups

Topics covered:
- Breaking barriers in tech
- Building inclusive teams
- Work-life integration
- Career growth strategies
- Mentorship importance

Open to all genders. Q&A session and networking lunch included.`,
    category: "networking",
    tags: ["networking", "women-in-tech", "leadership", "career"],
    city: "Lagos",
    state: "Lagos",
    venue: "https://maps.google.com/?q=Radisson+Blu+Victoria+Island+Lagos",
    address: "Radisson Blu Anchorage Hotel, 4326 Akin Adesola Street, Victoria Island, Lagos",
    capacity: 40,
    ticketType: "free",
    coverImage: "https://images.unsplash.com/photo-1573164713988-8665fc963095?w=1200&q=80",
    themeColor: "#831843",
  },
  {
    title: "Hiking Obudu Mountain - Weekend Adventure",
    description: `Experience the breathtaking beauty of Obudu Mountain Resort on this beginner-friendly hike!

Itinerary:
- Day 1: Guided hike up Obudu Plateau (8km trek)
- Overnight stay at the mountain resort
- Day 2: Sunrise view at the peak & descent

Package includes:
- Experienced trek leader
- Accommodation at the resort
- All meals during trek
- First aid kit
- Photography assistance

Moderate fitness level required. Age 16+ recommended.

Transport from Lagos/Enugu available at additional cost.`,
    category: "outdoor",
    tags: ["outdoor", "hiking", "adventure", "camping"],
    city: "Calabar",
    state: "Cross River",
    venue: "https://maps.google.com/?q=Obudu+Mountain+Resort+Cross+River",
    address: "Obudu Mountain Resort, Obudu, Cross River State",
    capacity: 20,
    ticketType: "paid",
    ticketPrice: 25000,
    coverImage: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&q=80",
    themeColor: "#065f46",
  },
  {
    title: "Community Clean-up Drive - Beach Edition",
    description: `Join hands to keep our beaches clean and beautiful!

Activity plan:
- Beach cleanup (2 hours)
- Waste segregation workshop
- Marine conservation talk
- Group photo session
- Certificate of participation

All cleaning materials provided. Wear comfortable clothes you don't mind getting dirty. Sunscreen and hat recommended.

Refreshments provided. A great way to give back to nature while meeting like-minded people!`,
    category: "community",
    tags: ["community", "environment", "volunteer", "beach"],
    city: "Lagos",
    state: "Lagos",
    venue: "https://maps.google.com/?q=Elegushi+Beach+Lagos",
    address: "Elegushi Beach, Ikate-Elegushi, Lagos",
    capacity: 100,
    ticketType: "free",
    coverImage: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80",
    themeColor: "#1e3a8a",
  },
  {
    title: "JavaScript Performance Optimization Masterclass",
    description: `Level up your JS skills with advanced performance techniques!

Topics covered:
- Memory management & garbage collection
- Event loop deep dive
- Web Workers & multithreading
- Code splitting strategies
- Bundle optimization with Webpack/Vite
- React performance patterns
- Profiling with Chrome DevTools

Intermediate JavaScript knowledge required. Bring your laptop with Node.js installed.

Code examples and cheat sheets provided.`,
    category: "tech",
    tags: ["tech", "javascript", "performance", "advanced"],
    city: "Abuja",
    state: "FCT",
    venue: "https://maps.google.com/?q=Transcorp+Hilton+Abuja",
    address: "Transcorp Hilton Conference Centre, 1 Aguiyi Ironsi Street, Maitama, Abuja",
    capacity: 40,
    ticketType: "paid",
    ticketPrice: 10000,
    coverImage: "https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=1200&q=80",
    themeColor: "#92400e",
  },
  {
    title: "Indie Game Dev Jam - 48 Hour Challenge",
    description: `Create a game from scratch in 48 hours!

Event highlights:
- Theme revealed at start
- Solo or team participation (max 4)
- Mentorship from industry devs
- Game engine workshops (Unity/Godot)
- Asset creation support
- Final showcase & judging

Prizes for:
- Best Overall Game
- Most Innovative Mechanic
- Best Art Style
- People's Choice

Sleeping bags welcome. Food and drinks provided throughout.`,
    category: "gaming",
    tags: ["gaming", "game-development", "hackathon", "indie"],
    city: "Lagos",
    state: "Lagos",
    venue: "https://maps.google.com/?q=Zone+Tech+Park+Gbagada+Lagos",
    address: "Zone Tech Park, 1 Gbagada Industrial Scheme, Gbagada, Lagos",
    capacity: 60,
    ticketType: "paid",
    ticketPrice: 5000,
    coverImage: "https://images.unsplash.com/photo-1556438064-2d7646166914?w=1200&q=80",
    themeColor: "#4c1d95",
  },
  {
    title: "AI Product Building Workshop - From Idea to MVP",
    description: `Learn to build AI-powered products from scratch in this hands-on workshop!

What you'll build:
- AI-powered customer support chatbot
- Intelligent document summarizer
- Smart recommendation engine prototype

Skills covered:
- Product ideation with AI capabilities
- API integration (OpenAI, Anthropic, Google)
- Prompt engineering for production
- UI/UX for AI products
- Deployment and scaling basics

Perfect for product managers, entrepreneurs, and developers looking to add AI to their toolkit. No prior ML experience needed - we focus on practical application!

Lunch and refreshments included. Bring your laptop!`,
    category: "tech",
    tags: ["tech", "ai", "product", "startup"],
    city: "Lagos",
    state: "Lagos",
    venue: "https://maps.google.com/?q=Microsoft+Africa+Development+Centre+Lagos",
    address: "Microsoft ADC, 1081 Adetokunbo Ademola Street, Victoria Island, Lagos",
    capacity: 40,
    ticketType: "paid",
    ticketPrice: 15000,
    coverImage: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=1200&q=80",
    themeColor: "#4c1d95",
  },
  {
    title: "Startup Founder's Breakfast - Funding & Growth Stories",
    description: `Connect with fellow founders and learn from successful entrepreneurs over breakfast!

Featured speakers:
- Series B founder sharing fundraising journey
- Angel investor revealing what they look for
- Growth hacker with proven scaling strategies
- Failed startup founder sharing lessons learned

Agenda:
- 8:00 AM - Networking breakfast
- 9:00 AM - Panel discussion
- 10:00 AM - Q&A session
- 10:30 AM - One-on-one speed networking

This intimate gathering is perfect for early-stage founders, aspiring entrepreneurs, and anyone interested in the Nigerian startup ecosystem.

Continental breakfast and unlimited coffee included!`,
    category: "business",
    tags: ["business", "startup", "networking", "entrepreneurship"],
    city: "Lagos",
    state: "Lagos",
    venue: "https://maps.google.com/?q=Eko+Hotels+Victoria+Island+Lagos",
    address: "Eko Hotels & Suites, 1415 Adetokunbo Ademola Street, Victoria Island, Lagos",
    capacity: 35,
    ticketType: "paid",
    ticketPrice: 5000,
    coverImage: "https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=1200&q=80",
    themeColor: "#065f46",
  },
  {
    title: "Weekend Photography Masterclass - Portrait & Street",
    description: `Elevate your photography skills with professional techniques!

Day 1 - Portrait Photography:
- Lighting setups (natural & artificial)
- Posing and directing subjects
- Camera settings for portraits
- Live model shoot session
- Post-processing in Lightroom

Day 2 - Street Photography:
- Finding compelling stories
- Composition techniques
- Candid vs posed shots
- Photo walk in Lekki and VI
- Ethics in street photography

Equipment: DSLR/Mirrorless camera required (no phone cameras for this workshop). Tripod optional.

All skill levels welcome. You'll leave with a portfolio of stunning images!

Snacks and beverages provided both days.`,
    category: "art",
    tags: ["art", "photography", "workshop", "creative"],
    city: "Lagos",
    state: "Lagos",
    venue: "https://maps.google.com/?q=Nike+Art+Gallery+Lekki+Lagos",
    address: "Nike Art Gallery, 2663 Eleko Beach Road, Lekki, Lagos",
    capacity: 20,
    ticketType: "paid",
    ticketPrice: 25000,
    coverImage: "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=1200&q=80",
    themeColor: "#92400e",
  },
  {
    title: "Corporate Football Tournament - Season 3",
    description: `The biggest corporate football showdown in Lagos is back!

Tournament format:
- 12 corporate teams competing
- 7-a-side format
- League stage + knockout rounds
- Professional referees and scoring
- Live commentary

Prizes:
- Winner: ₦1,000,000 + Trophy
- Runner-up: ₦500,000
- Best Striker, Goalkeeper & Player awards

Register your company team (7 players + 4 substitutes). Individual registrations also open - we'll form mixed teams.

What's included:
- Professional football pitch
- Match balls and equipment
- Refreshments throughout
- Team jerseys
- Photos & videos

Perfect for team building and corporate bonding!`,
    category: "sports",
    tags: ["sports", "football", "corporate", "tournament"],
    city: "Lagos",
    state: "Lagos",
    venue: "https://maps.google.com/?q=Tafawa+Balewa+Square+Lagos",
    address: "Tafawa Balewa Square, Broad Street, Lagos Island, Lagos",
    capacity: 180,
    ticketType: "paid",
    ticketPrice: 5000,
    coverImage: "https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=1200&q=80",
    themeColor: "#065f46",
  },
  {
    title: "Mindfulness & Stress Management for Professionals",
    description: `Combat workplace stress with evidence-based mindfulness techniques!

This workshop is designed for busy professionals who want to:
- Reduce anxiety and stress
- Improve focus and productivity
- Better manage work-life balance
- Build emotional resilience
- Enhance decision-making clarity

Session includes:
- Understanding stress response
- Guided meditation practice
- Breathing techniques for instant calm
- Mindful communication at work
- Creating daily wellness routines
- Apps and tools for continued practice

Led by a certified mindfulness coach with 10+ years of corporate wellness experience.

Yoga mats and meditation cushions provided. Wear comfortable clothing.

Healthy snacks and herbal teas included.`,
    category: "health",
    tags: ["health", "wellness", "mindfulness", "corporate"],
    city: "Lagos",
    state: "Lagos",
    venue: "https://maps.google.com/?q=Landmark+Centre+Victoria+Island+Lagos",
    address: "Landmark Centre, Water Corporation Road, Victoria Island, Lagos",
    capacity: 25,
    ticketType: "paid",
    ticketPrice: 9000,
    coverImage: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=1200&q=80",
    themeColor: "#831843",
  },
  {
    title: "Suya & Grill Masterclass: A Taste of Nigeria",
    description: `Join us for an evening of grilling mastery! Learn the secrets to crafting the perfect suya, asun, and other Nigerian grilled delicacies. You'll leave with new skills and a full stomach.`,
    category: "food",
    tags: ["food"],
    city: "Port Harcourt",
    state: "Rivers",
    venue: "https://maps.google.com/?q=Hotel+Presidential+Port+Harcourt",
    address: "Hotel Presidential Event Hall, Aba Road, Port Harcourt",
    capacity: 10,
    ticketType: "free",
    coverImage: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1200&q=80",
    themeColor: "#831843",
  },
  {
    title: "React & Next.js: Building the Future of Web Applications",
    description: `Explore the latest advancements in React and Next.js, and discover how these technologies are shaping modern web development. This event provides insights into server-side rendering, performance optimization, and the future roadmap for building scalable and efficient web applications. Attendees will gain practical knowledge and explore best practices for leveraging these powerful tools.`,
    category: "tech",
    tags: ["tech"],
    city: "Lagos",
    state: "Lagos",
    venue: "https://maps.google.com/?q=Microsoft+Africa+Development+Centre+Lagos",
    address: "Microsoft ADC, 1081 Adetokunbo Ademola Street, Victoria Island, Lagos",
    capacity: 75,
    ticketType: "paid",
    ticketPrice: 2500,
    coverImage: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=1200&q=80",
    themeColor: "#1e3a8a",
  },
];

// Helper functions
function getRandomFutureDate(minDays = 7, maxDays = 90): number {
  const now = Date.now();
  const randomDays = Math.floor(Math.random() * (maxDays - minDays) + minDays);
  return now + randomDays * 24 * 60 * 60 * 1000;
}

function getEventEndTime(startTime: number): number {
  const durationHours = Math.floor(Math.random() * 3) + 2;
  return startTime + durationHours * 60 * 60 * 1000;
}

function generateSlug(title: string): string {
  const uniqueId = Math.random().toString(36).slice(2, 7);
  const cleanTitle = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
    
  return `${cleanTitle}-${Date.now()}-${uniqueId}`;
}

// RUN THIS DIRECTLY FROM CONVEX DASHBOARD
// Go to Dashboard > Functions > seed:run > Run
export const run = internalMutation({
  handler: async (ctx) => {
    // 1. Fetch or create a fallback organizer user
    let organizer = await ctx.db.query("users").first();

    if (!organizer) {
      const organizerId = await ctx.db.insert("users", {
        email: "organizer@eventhub.com",
        tokenIdentifier: "seed-user-token",
        name: "EventHub Team",
        hasCompletedOnboarding: true,
        location: {
          city: "Port Harcourt",
          state: "Rivers",
          country: "Nigeria",
        },
        interests: ["tech", "music", "business"],
        freeEventsCreated: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      organizer = await ctx.db.get(organizerId);
    }

    if (!organizer) {
      throw new Error("Failed to initialize or retrieve seeding organizer.");
    }

    // 2. Build mock structural objects and insert them concurrently via Promise.all
    const seedPromises = SAMPLE_EVENTS.map((eventData) => {
      const startDate = getRandomFutureDate();
      const endDate = getEventEndTime(startDate);
      const registrationCount = Math.floor(Math.random() * eventData.capacity * 0.7);

      const event = {
        ...eventData,
        slug: generateSlug(eventData.title),
        organizerId: organizer._id,
        organizerName: organizer.name,
        startDate,
        endDate,
        timezone: "Africa/Lagos",
        locationType: "physical" as const,
        country: "Nigeria",
        registrationCount,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      return ctx.db.insert("events", event);
    });

    await Promise.all(seedPromises);

    console.log(`✅ Successfully seeded ${SAMPLE_EVENTS.length} events!`);
    return {
      success: true,
      count: SAMPLE_EVENTS.length,
      events: SAMPLE_EVENTS.map(e => e.title),
    };
  },
});

// Optional: Clear all events and associated registrations concurrently
export const clear = internalMutation({
  handler: async (ctx) => {
    const events = await ctx.db.query("events").collect();

    const deletionPromises = events.map(async (event) => {
      // Collect linked target entries
      const registrations = await ctx.db
        .query("registrations")
        .withIndex("by_event", (q) => q.eq("eventId", event._id))
        .collect();

      // Clear child documents concurrently
      await Promise.all(registrations.map((reg) => ctx.db.delete(reg._id)));
      
      // Delete event document
      await ctx.db.delete(event._id);
    });

    await Promise.all(deletionPromises);

    console.log(`🗑️ Cleared ${events.length} events and dependencies.`);
    return { success: true, deleted: events.length };
  },
});