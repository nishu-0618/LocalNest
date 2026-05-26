// seed.js
// High-Fidelity Bangalore LocalNest sharing platform data seeding script.
// Seeds exactly 5 realistic demo users with customized positions, roles, trust scores, notifications, and activities.

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

dotenv.config();

const User = require('./models/User');
const Listing = require('./models/Listing');
const Transaction = require('./models/Transaction');
const Notification = require('./models/Notification');
const NeedRequest = require('./models/NeedRequest');
const Review = require('./models/Review');
const Activity = require('./models/Activity');

const seedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/localnest');
    console.log('✅ Connected to MongoDB');

    // 🗑️ Clear existing data
    await User.deleteMany();
    await Listing.deleteMany();
    await Transaction.deleteMany();
    await Notification.deleteMany();
    await NeedRequest.deleteMany();
    await Review.deleteMany();
    await Activity.deleteMany();
    console.log('🗑️  Cleared existing database collections');

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);

    // 👥 Insert exactly 5 high-fidelity Bangalore demo users
    const usersData = [
      {
        name: 'Rahul Verma',
        email: 'rahul@demo.com',
        password: hashedPassword,
        phone: '9876543210',
        location: { type: 'Point', coordinates: [77.4835, 12.9178], address: 'Kengeri, Bangalore' },
        locality: 'Kengeri',
        profileImage: '',
        trustScore: 84,
        rating: 4.8,
        totalRatings: 15,
        role: 'both',
        bio: 'Housing owner & tech enthusiast. Always ready to lend tools and share extra household items with neighbors in Kengeri.',
        responseRate: 98,
        verificationStatus: 'verified',
        successfulExchanges: 12,
        badge: '✔ Trusted Member',
        createdAt: new Date('2024-01-10T12:00:00Z')
      },
      {
        name: 'Aisha Khan',
        email: 'aisha@demo.com',
        password: hashedPassword,
        phone: '9876543211',
        location: { type: 'Point', coordinates: [77.5186, 12.9274], address: 'RR Nagar, Bangalore' },
        locality: 'RR Nagar',
        profileImage: '',
        trustScore: 78,
        rating: 4.5,
        totalRatings: 8,
        role: 'both',
        bio: 'Active borrower & roommate seeker. Loves cycling, exploring Turahalli, and community projects.',
        responseRate: 95,
        verificationStatus: 'verified',
        successfulExchanges: 7,
        badge: '✔ Reliable Borrower',
        createdAt: new Date('2024-03-15T12:00:00Z')
      },
      {
        name: 'Sneha Reddy',
        email: 'sneha@demo.com',
        password: hashedPassword,
        phone: '9876543212',
        location: { type: 'Point', coordinates: [77.5450, 12.9030], address: 'Uttarahalli, Bangalore' },
        locality: 'Uttarahalli',
        profileImage: '',
        trustScore: 88,
        rating: 4.9,
        totalRatings: 18,
        role: 'both',
        bio: 'PG Owner and social helper. Committed to raising neighborhood support systems and quick responses.',
        responseRate: 100,
        verificationStatus: 'verified',
        successfulExchanges: 10,
        badge: '✔ Neighborhood Hero',
        createdAt: new Date('2023-11-20T12:00:00Z')
      },
      {
        name: 'Varun Shetty',
        email: 'varun@demo.com',
        password: hashedPassword,
        phone: '9876543213',
        location: { type: 'Point', coordinates: [77.5028, 12.9155], address: 'Srinivaspura, Bangalore' },
        locality: 'Srinivaspura',
        profileImage: '',
        trustScore: 46,
        rating: 3.8,
        totalRatings: 3,
        role: 'both',
        bio: 'Engineering student in Bangalore. Friendly but had one late return due to exam schedules. Working to rebuild trust!',
        responseRate: 80,
        verificationStatus: 'none',
        successfulExchanges: 2,
        badge: '⚠ New User',
        createdAt: new Date('2025-02-05T12:00:00Z')
      },
      {
        name: 'Kavya Gowda',
        email: 'kavya@demo.com',
        password: hashedPassword,
        phone: '9876543214',
        location: { type: 'Point', coordinates: [77.4760, 12.9140], address: 'Kengeri Satellite Town, Bangalore' },
        locality: 'Kengeri Satellite Town',
        profileImage: '',
        trustScore: 39,
        rating: 3.5,
        totalRatings: 1,
        role: 'both',
        bio: 'Kitchen lender and emergency requester. New to this locality, profile details validation is pending.',
        responseRate: 75,
        verificationStatus: 'pending',
        successfulExchanges: 1,
        badge: '⚠ Verification Pending',
        createdAt: new Date('2025-04-01T12:00:00Z')
      }
    ];

    const createdUsers = await User.insertMany(usersData);
    const rahul = createdUsers[0];
    const aisha = createdUsers[1];
    const sneha = createdUsers[2];
    const varun = createdUsers[3];
    const kavya = createdUsers[4];

    console.log(`👥 Inserted 5 Bangalore Demo Users with password 'password123'`);

    // 🏠 Insert high-fidelity listings
    const listingsData = [
      // Rahul's Listings (Kengeri)
      {
        postedBy: rahul._id,
        title: 'Bosch Power Drill 500W',
        description: 'Robust power drill for home DIY tasks. Comes with a complete set of drill bits. Please handle with care and return within a day.',
        type: 'resource',
        tags: ['drill', 'tools', 'diy'],
        location: rahul.location,
        views: 45,
        resourceDetails: { itemName: 'Power Drill', category: 'tools', condition: 'good', borrowDurationDays: 1, deposit: 0, availableToday: true, isEmergency: false, isFree: true }
      },
      {
        postedBy: rahul._id,
        title: 'Ergonomic Mesh Study Chair',
        description: 'Premium height-adjustable study chair with lumbar support. Perfect for WFH setups or long study hours.',
        type: 'resource',
        tags: ['furniture', 'chair', 'wfh'],
        location: rahul.location,
        views: 28,
        resourceDetails: { itemName: 'Study Chair', category: 'furniture', condition: 'good', borrowDurationDays: 7, deposit: 0, availableToday: true, isEmergency: false, isFree: true }
      },
      {
        postedBy: rahul._id,
        title: 'Shared 2BHK Flat near Kengeri Metro',
        description: 'Spacious and well-ventilated 2BHK flat. Looking for a neat flatmate. Kengeri Metro Station is just a 5-minute walk away.',
        type: 'housing',
        tags: ['flatmate', 'metro', 'kengeri'],
        location: rahul.location,
        views: 96,
        housingDetails: { rent: 8500, deposit: 25000, flatType: '2bhk', furnished: 'semi-furnished', societyName: 'Metro Green Apartments', genderPreference: 'any', amenities: ['WiFi', 'Washing Machine', 'Power Backup', 'Security'] }
      },

      // Aisha's Listings
      // (Needs bicycle & female roommate -> represented as NeedRequests instead of Lend listings to avoid clutter)

      // Sneha's Listings (Uttarahalli)
      {
        postedBy: sneha._id,
        title: 'Safe Girls PG near Mysore Road',
        description: 'Comfortable PG accommodation for college girls and working professionals. 24/7 security, high-speed internet, and three healthy home-cooked meals included.',
        type: 'housing',
        tags: ['pg', 'girls-only', 'mysore-road'],
        location: sneha.location,
        views: 120,
        housingDetails: { rent: 7000, deposit: 15000, flatType: 'pg', furnished: 'furnished', societyName: 'Mathrushree Elite Ladies PG', genderPreference: 'female', amenities: ['WiFi', 'Meals', 'Washing Machine', 'CCTV Security'] }
      },

      // Varun's Listings (Srinivaspura)
      {
        postedBy: varun._id,
        title: 'VTU Engineering Textbooks (CSE 4th Sem)',
        description: 'Core engineering textbooks for CSE 4th Semester (Design & Analysis of Algorithms, Microcontrollers, Software Engineering). Available for student reference.',
        type: 'resource',
        tags: ['books', 'engineering', 'vtu'],
        location: varun.location,
        views: 18,
        resourceDetails: { itemName: 'Engineering Textbooks', category: 'books', condition: 'fair', borrowDurationDays: 45, deposit: 0, availableToday: true, isEmergency: false, isFree: true }
      },
      {
        postedBy: varun._id,
        title: 'Casio Scientific Calculator fx-991EX',
        description: 'High-performance scientific calculator ideal for engineering students. Return after the exam week.',
        type: 'resource',
        tags: ['electronics', 'calculator', 'exam'],
        location: varun.location,
        views: 12,
        resourceDetails: { itemName: 'Scientific Calculator', category: 'electronics', condition: 'good', borrowDurationDays: 5, deposit: 0, availableToday: true, isEmergency: false, isFree: true }
      },
      {
        postedBy: varun._id,
        title: 'Prestige Induction Cooktop 2000W',
        description: 'Highly useful induction stove with pre-programmed menu options. Perfect if your gas cylinder suddenly runs out.',
        type: 'resource',
        tags: ['kitchen', 'stove', 'induction'],
        location: varun.location,
        views: 22,
        resourceDetails: { itemName: 'Induction Stove', category: 'kitchen', condition: 'good', borrowDurationDays: 3, deposit: 0, availableToday: true, isEmergency: false, isFree: true }
      },

      // Kavya's Listings (Kengeri Satellite Town)
      {
        postedBy: kavya._id,
        title: 'Prestige 1.8L Rice Cooker',
        description: 'Automatic electric rice cooker. Cooks rice perfectly in minutes. Cleaned and sanitized.',
        type: 'resource',
        tags: ['kitchen', 'cooker', 'appliances'],
        location: kavya.location,
        views: 9,
        resourceDetails: { itemName: 'Rice Cooker', category: 'kitchen', condition: 'good', borrowDurationDays: 3, deposit: 0, availableToday: true, isEmergency: false, isFree: true }
      },
      {
        postedBy: kavya._id,
        title: 'USHA Rechargeable Portable Fan',
        description: 'Compact rechargeable table fan. High air delivery, battery backup of 4 hours on medium speed.',
        type: 'resource',
        tags: ['electronics', 'fan', 'cooling'],
        location: kavya.location,
        views: 15,
        resourceDetails: { itemName: 'Portable Fan', category: 'electronics', condition: 'good', borrowDurationDays: 4, deposit: 0, availableToday: true, isEmergency: false, isFree: true }
      },
      {
        postedBy: varun._id,
        title: 'Private Room in Shared 3BHK near Srinivaspura PG',
        description: 'Cozy private room in a spacious 3BHK. Fully furnished with study table, wardrobe, and single bed. Currently shared by two friendly CSE student roommates. Perfect for students!',
        type: 'housing',
        tags: ['flatmate', 'student', 'shared', 'srinivaspura'],
        location: varun.location,
        views: 45,
        housingDetails: { rent: 6000, deposit: 18000, flatType: 'shared', furnished: 'furnished', societyName: 'Srinivaspura Residency', genderPreference: 'male', amenities: ['WiFi', 'Washing Machine', 'Refrigerator', 'Kitchen Access'] }
      },
      {
        postedBy: aisha._id,
        title: 'Spacious Room for Female Flatmate in RR Nagar',
        description: 'Private bedroom available in a highly secure 3BHK flat in RR Nagar. Gated community with robust security. Ideally looking for a professional female flatmate who values cleanliness.',
        type: 'housing',
        tags: ['flatmate', 'rrnagar', 'female-only'],
        location: aisha.location,
        views: 73,
        housingDetails: { rent: 9000, deposit: 30000, flatType: 'single', furnished: 'furnished', societyName: 'Royal Crest Apartments', genderPreference: 'female', amenities: ['WiFi', 'Washing Machine', 'Gym', 'Clubhouse Access', 'Security'] }
      },
      {
        postedBy: sneha._id,
        title: 'Cozy 1BHK Studio near Uttarahalli Lake',
        description: 'Fully furnished independent 1BHK studio. Ideal for a student, bachelor, or couple. Quiet residential area, includes high-speed fiber internet and round-the-clock water supply.',
        type: 'housing',
        tags: ['1bhk', 'studio', 'uttarahalli'],
        location: sneha.location,
        views: 52,
        housingDetails: { rent: 11000, deposit: 25000, flatType: '1bhk', furnished: 'furnished', societyName: 'Lake View Gardens', genderPreference: 'any', amenities: ['WiFi', 'Geyser', 'Kitchenette', 'Parking'] }
      }
    ];

    const createdListings = await Listing.insertMany(listingsData);
    console.log(`🏠 Inserted ${createdListings.length} high-fidelity Bangalore listings`);

    // 📩 Seed specific community need requests (Normal & Emergency)
    const needsData = [
      // Aisha's Normal Requests
      {
        userId: aisha._id,
        itemName: 'Bicycle for Weekend Rides',
        category: 'sports',
        urgency: 'medium',
        description: 'Looking to borrow a bicycle for weekend rides to Turahalli Forest. Will return it fully cleaned.',
        location: aisha.location,
        requiredBy: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
        fulfilledStatus: false
      },
      {
        userId: aisha._id,
        itemName: 'Female Flatmate for Sharing Flat',
        category: 'others',
        urgency: 'low',
        description: 'Looking for a female roommate to share flat in RR Nagar. Budget is around 6k.',
        location: aisha.location,
        fulfilledStatus: false
      },

      // 🚨 Seed the exact 3 Emergency requests (MUST go to NeedRequest collection, category = 'emergency')
      {
        userId: kavya._id,
        itemName: 'Induction stove urgently tonight',
        category: 'emergency',
        urgency: 'critical',
        description: 'Gas cylinder ran out suddenly, cooking for children is delayed. Need an induction stove urgently tonight just for cooking dinner!',
        location: kavya.location,
        requiredBy: new Date(),
        fulfilledStatus: false
      },
      {
        userId: sneha._id,
        itemName: 'Medicine pickup immediately',
        category: 'emergency',
        urgency: 'critical',
        description: 'URGENT: Senior citizen neighbor requires immediate cardiac medicine from Kengeri Hospital pharmacy. I am unable to leave PG gate right now due to PG checking.',
        location: sneha.location,
        requiredBy: new Date(),
        fulfilledStatus: false
      },
      {
        userId: varun._id,
        itemName: 'Portable charger for exam tomorrow',
        category: 'emergency',
        urgency: 'high',
        description: 'My phone charger port is loose and I have an early VTU practical exam tomorrow. Need a reliable portable power bank urgently for tonight and tomorrow.',
        location: varun.location,
        requiredBy: new Date(Date.now() + 24 * 60 * 60 * 1000),
        fulfilledStatus: false
      }
    ];

    const createdNeeds = await NeedRequest.insertMany(needsData);
    console.log(`🚨 Seeded ${createdNeeds.length} community requests (including 3 High-Priority Emergencies)`);

    // 🤝 Seed interactive demo Transaction: Aisha Khan requesting Rahul Verma's Bosch Drill
    const testTransaction = await Transaction.create({
      listing: createdListings[0]._id, // Rahul's Bosch Drill
      borrower: aisha._id,
      lender: rahul._id,
      status: 'pending',
      borrowDays: 1,
      requestedPickupDate: new Date(),
      message: 'Hi Rahul! I recently moved in and need to hang a few photo frames in my living room tonight. Can I borrow your Bosch power drill? I will return it safely by tomorrow evening!'
    });
    console.log(`🤝 Seeded 1 Pending Transaction: Aisha Khan requested Rahul's Bosch Drill`);

    // 🔔 Seed specific notifications required for each user
    const notificationsData = [
      // Rahul Verma's notifications
      {
        recipient: rahul._id,
        type: 'borrow_request',
        message: 'Aisha Khan requested your Bosch drill',
        relatedTransaction: testTransaction._id,
        relatedListing: createdListings[0]._id,
        isRead: false,
        createdAt: new Date(Date.now() - 10 * 60 * 1000) // 10 mins ago
      },
      {
        recipient: rahul._id,
        type: 'view_update',
        message: 'Sneha viewed your housing listing',
        relatedListing: createdListings[2]._id, // Rahul's shared 2BHK
        isRead: true,
        createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000) // 1 hr ago
      },
      {
        recipient: rahul._id,
        type: 'trust_update',
        message: 'Trust score increased to 84',
        isRead: false,
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hrs ago
      },
      {
        recipient: rahul._id,
        type: 'view_update',
        message: 'Your listing received 12 new views',
        relatedListing: createdListings[0]._id,
        isRead: true,
        createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000)
      },

      // Aisha Khan's notifications
      {
        recipient: aisha._id,
        type: 'request_approved',
        message: 'Rahul approved your borrow request',
        isRead: false,
        createdAt: new Date(Date.now() - 5 * 60 * 1000)
      },
      {
        recipient: aisha._id,
        type: 'roommate_match',
        message: 'New roommate match near RR Nagar',
        isRead: true,
        createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000)
      },
      {
        recipient: aisha._id,
        type: 'expiry_alert',
        message: 'Your bicycle request expires tomorrow',
        isRead: false,
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000)
      },

      // Sneha Reddy's notifications
      {
        recipient: sneha._id,
        type: 'saved_listing',
        message: '2 users saved your PG listing',
        relatedListing: createdListings[3]._id, // Sneha's PG
        isRead: false,
        createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000)
      },
      {
        recipient: sneha._id,
        type: 'borrow_request',
        message: 'New inquiry for girls PG',
        relatedListing: createdListings[3]._id,
        isRead: true,
        createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000)
      },

      // Varun Shetty's notifications
      {
        recipient: varun._id,
        type: 'trust_update',
        message: 'Successful return improved your reliability',
        isRead: false,
        createdAt: new Date(Date.now() - 12 * 60 * 1000)
      },
      {
        recipient: varun._id,
        type: 'trust_update',
        message: 'Trust score increased from 46 → 51',
        isRead: false,
        createdAt: new Date(Date.now() - 11 * 60 * 1000)
      }
    ];

    await Notification.insertMany(notificationsData);
    console.log(`🔔 Seeded unique notifications for Bangalore demo users`);

    // 📈 Seed user activities for timelines
    const activitiesData = [
      // Rahul
      { userId: rahul._id, action: 'Listed Bosch Power Drill 500W for community sharing', createdAt: new Date('2025-05-01T10:00:00Z') },
      { userId: rahul._id, action: 'Offered Shared 2BHK Flat near Kengeri Metro', createdAt: new Date('2025-05-05T12:00:00Z') },
      { userId: rahul._id, action: 'Completed 12 successful resource exchanges in Kengeri', createdAt: new Date('2025-05-10T15:00:00Z') },

      // Aisha
      { userId: aisha._id, action: 'Broadcasted request for a Bicycle in RR Nagar', createdAt: new Date('2025-05-08T11:00:00Z') },
      { userId: aisha._id, action: 'Broadcasted roommate requirement looking for females', createdAt: new Date('2025-05-09T09:30:00Z') },

      // Sneha
      { userId: sneha._id, action: 'Listed Girls PG Accommodation near Mysore Road', createdAt: new Date('2025-05-02T08:00:00Z') },
      { userId: sneha._id, action: 'Helped fulfill 10+ medical & general community needs', createdAt: new Date('2025-05-07T18:00:00Z') },

      // Varun
      { userId: varun._id, action: 'Returned a study table late due to university exams', createdAt: new Date('2025-04-20T17:00:00Z') },
      { userId: varun._id, action: 'Returned electric kettle on time, trust improved (+5)', createdAt: new Date('2025-05-16T11:30:00Z') },

      // Kavya
      { userId: kavya._id, action: 'Joined Kengeri Satellite Town community network', createdAt: new Date('2025-05-12T14:20:00Z') },
      { userId: kavya._id, action: 'Broadcasted urgent emergency support request', createdAt: new Date('2025-05-17T19:00:00Z') }
    ];

    await Activity.insertMany(activitiesData);
    console.log(`📈 Seeded initial profile activities and timelines`);

    console.log('\n🎉 Real trust-driven Bangalore sharing ecosystem seeded successfully!');
    console.log('Use these accounts to test (Password: password123):');
    createdUsers.forEach(u => {
      console.log(`- ${u.name} (${u.email}) | Locality: ${u.locality} | Trust Score: ${u.trustScore} | Badge: ${u.badge}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  }
};

seedDB();