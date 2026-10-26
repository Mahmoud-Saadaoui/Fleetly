require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/user');
const Branch = require('../models/branch');
const Vehicle = require('../models/vehicle');
const Booking = require('../models/booking');

const dbConnect = require('../config/connect');

const seed = async () => {
  try {
    await dbConnect();
    console.log('Connected to DB');

    // Clean existing demo data (optional - be careful in prod)
    await Promise.all([
      User.deleteMany({ email: { $in: [/demo/i, /test/i] } }),
      // Don't delete all, just demo if needed
    ]);

    // Create branches
    const branches = await Branch.create([
      {
        name: 'Fleetly Paris',
        code: 'PAR01',
        address: { street: '15 Avenue des Champs-Élysées', city: 'Paris', postalCode: '75008', country: 'FR' },
        phone: '+33 1 23 45 67 89',
        email: 'paris@fleetly.fr',
      },
      {
        name: 'Fleetly Lyon',
        code: 'LYO01',
        address: { street: '25 Place Bellecour', city: 'Lyon', postalCode: '69002', country: 'FR' },
        phone: '+33 4 56 78 90 12',
        email: 'lyon@fleetly.fr',
      },
      {
        name: 'Fleetly Marseille',
        code: 'MAR01',
        address: { street: '10 Vieux-Port', city: 'Marseille', postalCode: '13002', country: 'FR' },
        phone: '+33 4 91 23 45 67',
        email: 'marseille@fleetly.fr',
      },
    ]);
    console.log('Branches created:', branches.length);

    // Create admin user
    const saltRounds = 12;
    const adminPassword = await bcrypt.hash('demo1234', saltRounds);
    const admin = await User.create({
      name: 'Admin Demo',
      email: 'admin@demo.com',
      password: adminPassword,
      role: 'admin',
      branchIds: [branches[0]._id, branches[1]._id, branches[2]._id],
      isActive: true,
    });
    console.log('Admin created:', admin.email);

    // Create fleet manager
    const fleetManager = await User.create({
      name: 'Fleet Manager',
      email: 'fleet@demo.com',
      password: adminPassword,
      role: 'agency_manager',
      branchIds: [branches[0]._id],
      isActive: true,
    });

    // Create customer
    const customer = await User.create({
      name: 'Jean Dupont',
      email: 'client@demo.com',
      password: adminPassword,
      role: 'user',
      isActive: true,
    });
    console.log('Users created');

    // Create vehicles
    const vehicles = await Vehicle.create([
      {
        make: 'Tesla',
        model: 'Model 3',
        category: 'Électrique',
        registrationNumber: 'AA-123-BB',
        branch: branches[0]._id,
        dailyRateCents: 15000, // 150€
        currency: 'EUR',
        seats: 5,
        transmission: 'Automatique',
        fuelType: 'Électrique',
        mileage: 5000,
        status: 'available',
        images: [],
      },
      {
        make: 'Porsche',
        model: '911 Carrera',
        category: 'Sport',
        registrationNumber: 'BB-456-CC',
        branch: branches[0]._id,
        dailyRateCents: 35000, // 350€
        currency: 'EUR',
        seats: 4,
        transmission: 'Automatique',
        fuelType: 'Essence',
        mileage: 8000,
        status: 'available',
      },
      {
        make: 'Mercedes-Benz',
        model: 'S-Class',
        category: 'Premium',
        registrationNumber: 'CC-789-DD',
        branch: branches[1]._id,
        dailyRateCents: 25000, // 250€
        currency: 'EUR',
        seats: 5,
        transmission: 'Automatique',
        fuelType: 'Essence',
        mileage: 3000,
        status: 'available',
      },
      {
        make: 'BMW',
        model: 'X5',
        category: 'SUV',
        registrationNumber: 'DD-012-EE',
        branch: branches[1]._id,
        dailyRateCents: 20000, // 200€
        currency: 'EUR',
        seats: 7,
        transmission: 'Automatique',
        fuelType: 'Diesel',
        mileage: 12000,
        status: 'available',
      },
      {
        make: 'Audi',
        model: 'A4',
        category: 'Business',
        registrationNumber: 'EE-345-FF',
        branch: branches[2]._id,
        dailyRateCents: 12000, // 120€
        currency: 'EUR',
        seats: 5,
        transmission: 'Automatique',
        fuelType: 'Diesel',
        mileage: 15000,
        status: 'available',
      },
      {
        make: 'Renault',
        model: 'Clio',
        category: 'Citadine',
        registrationNumber: 'FF-678-GG',
        branch: branches[2]._id,
        dailyRateCents: 6000, // 60€
        currency: 'EUR',
        seats: 5,
        transmission: 'Manuelle',
        fuelType: 'Essence',
        mileage: 20000,
        status: 'available',
      },
    ]);
    console.log('Vehicles created:', vehicles.length);

    // Create bookings (for calendar demo)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date(tomorrow);
    dayAfter.setDate(dayAfter.getDate() + 2);

    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const nextWeekEnd = new Date(nextWeek);
    nextWeekEnd.setDate(nextWeekEnd.getDate() + 3);

    await Booking.create([
      {
        customer: customer._id,
        vehicle: vehicles[1]._id, // Porsche
        pickupBranch: branches[0]._id,
        returnBranch: branches[0]._id,
        startAt: tomorrow,
        endAt: dayAfter,
        pricing: {
          dailyRateCents: 35000,
          rentalDays: 2,
          subtotalCents: 70000,
          extrasCents: 0,
          discountCents: 0,
          taxCents: 14000,
          totalCents: 84000,
          currency: 'EUR',
        },
        status: 'confirmed',
      },
      {
        customer: customer._id,
        vehicle: vehicles[0]._id, // Tesla
        pickupBranch: branches[0]._id,
        returnBranch: branches[0]._id,
        startAt: nextWeek,
        endAt: nextWeekEnd,
        pricing: {
          dailyRateCents: 15000,
          rentalDays: 3,
          subtotalCents: 45000,
          extrasCents: 0,
          discountCents: 0,
          taxCents: 9000,
          totalCents: 54000,
          currency: 'EUR',
        },
        status: 'active',
      },
    ]);
    console.log('Demo bookings created');

    console.log('\n=== SEED COMPLETED ===');
    console.log('Admin:', 'admin@demo.com / demo1234');
    console.log('Fleet:', 'fleet@demo.com / demo1234');
    console.log('Client:', 'client@demo.com / demo1234');
    console.log('=====================');
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seed();
