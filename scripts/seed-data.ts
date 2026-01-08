/**
 * Ultimate Data Seeding Script for Eazzy Flow (TeleFlow AI)
 * 
 * Objective: Initialize specific demo data scenarios with Billing & Latency Logic.
 * 
 * Scenarios:
 * 1. Cluster A: "Laggy Gamers" (200 Users) - High Latency, Stopped Paying.
 * 2. Cluster B: "Stable Users" (800 Users) - Healthy Usage, Regular Payments.
 * 
 * Usage: npx tsx scripts/seed-data.ts
 */

import { createClient } from '@supabase/supabase-js';
import { faker } from '@faker-js/faker';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase Cloud credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// --- Constants ---

const OCS_PRODUCTS = [
  { technical_id: "P_VAS_GAMING", marketing_name: "Game Booster Pro", type: "VAS", price: 500.00, description: "Unlimited gaming data for Mobile Legends (24h).", category: "Gaming" },
  { technical_id: "P_BUNDLE_SUPER", marketing_name: "Super Monthly", type: "Bundle", price: 15000.00, description: "10GB Data + 100 Mins + Unlimited SMS", category: "Monthly Packs" },
  { technical_id: "P_DATA_1GB_NIGHT", marketing_name: "Night Owl 1GB", type: "Data", price: 800.00, description: "1GB Data for use between 11PM - 7AM.", category: "Night Packs" },
  { technical_id: "P_VOICE_100MIN", marketing_name: "Talk More 100", type: "Voice", price: 3000.00, description: "100 Minutes to any local network.", category: "Voice Bundles" }
];

// Device Prototypes
const DEVICES = [
  // Low End (4G) - The Problematic Ones
  { brand: 'Apple', model: 'iPhone 11', network_capability: '4G', is_gaming: true, tag: 'risk_iphone' },
  { brand: 'Samsung', model: 'Galaxy S10', network_capability: '4G', is_gaming: true, tag: 'risk_samsung' },
  // High End (5G) - The Stable Ones
  { brand: 'Apple', model: 'iPhone 16 Pro', network_capability: '5G', is_gaming: true, tag: 'stable_iphone' },
  { brand: 'Xiaomi', model: 'Redmi Note 13', network_capability: '5G', is_gaming: true, tag: 'stable_xiaomi' }
];

// --- Helper Functions ---

const getRandomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

// --- Main Execution ---

async function seed() {
  console.log('🚀 Starting Eazzy Flow Ultimate Data Seed...');

  // 1. Seed Reference Data
  console.log('📦 Seeding Products & Devices...');

  // Products
  for (const p of OCS_PRODUCTS) {
    const { error } = await supabase.from('products').upsert(p, { onConflict: 'technical_id' });
    if (error) console.error(`Error Upserting ${p.technical_id}:`, error.message);
  }

  // Devices
  // First, get or create IDs for our device types
  const deviceMap: Record<string, string> = {};

  // Clear existing devices first to clean slate
  await supabase.from('dim_devices').delete().neq('brand', 'ZZZ');

  for (const d of DEVICES) {
    const { data, error } = await supabase.from('dim_devices').insert({
      brand: d.brand,
      model: d.model,
      network_capability: d.network_capability,
      is_gaming: d.is_gaming
    }).select().single();

    if (data) {
      deviceMap[d.tag] = data.id;
    } else if (error) {
      console.error(`Error inserting device ${d.model}:`, error.message);
    }
  }

  // 1.1 Seed Campaigns (Mock Data for Flight Board)
  console.log('📢 Seeding Campaigns...');
  const CAMPAIGNS = [
    { id: crypto.randomUUID(), name: "5G Early Access", status: 'active', reach: 12500, conversion_rate: 0.12, channel: 'SMS' },
    { id: crypto.randomUUID(), name: "Winback Inactive", status: 'paused', reach: 4500, conversion_rate: 0.04, channel: 'Email' },
    { id: crypto.randomUUID(), name: "Weekend Data Blast", status: 'active', reach: 8900, conversion_rate: 0.18, channel: 'Push' }
  ];

  for (const c of CAMPAIGNS) {
    const { error } = await supabase.from('campaigns').upsert(c);
    if (error) console.error(`Error Upserting Campaign ${c.name}:`, error.message);
  }

  // 2. Generate Users & Transactions
  console.log('👥 Generating 1,000 Users with Billing History...');

  const USERS_TOTAL = 1000;
  const RISK_COUNT = 200; // Cluster A

  const profileBatch = [];
  const billingBatch = [];
  const usageBatch = [];

  const BATCH_SIZE = 50;

  for (let i = 0; i < USERS_TOTAL; i++) {
    const userId = crypto.randomUUID();
    const isRiskGroup = i < RISK_COUNT; // First 200 are risk

    // Assign Device
    let deviceId, deviceName;
    if (isRiskGroup) {
      const tag = Math.random() > 0.5 ? 'risk_iphone' : 'risk_samsung';
      deviceId = deviceMap[tag];
      deviceName = tag.includes('iphone') ? 'iPhone 11' : 'Galaxy S10';
    } else {
      const tag = Math.random() > 0.5 ? 'stable_iphone' : 'stable_xiaomi';
      deviceId = deviceMap[tag];
      deviceName = tag.includes('iphone') ? 'iPhone 16 Pro' : 'Redmi Note 13';
    }

    // --- Create Profile ---
    const profile = {
      id: userId,
      msisdn: faker.phone.number({ style: 'international' }).replace(/\D/g, '').slice(0, 11),
      name: isRiskGroup ? `Gamer ${faker.person.firstName()}` : faker.person.fullName(),
      age: isRiskGroup ? getRandomInt(18, 24) : getRandomInt(25, 45),
      gender: faker.helpers.arrayElement(['Male', 'Female']),
      tier: isRiskGroup ? 'Silver' : faker.helpers.arrayElement(['Gold', 'Platinum', 'Diamond']),
      status: 'Active',
      device_id: deviceId,
      device_type: deviceName,
      location_city: 'Yangon',
      churn_score: isRiskGroup ? 0.85 : 0.1, // AI needs this ground truth for training/validation
      balance: 0, // Will be updated by trigger, but we set initial logic here
      created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
    };

    // Manual Balance Calculation (since triggers might not run on bulk insert efficiently in client mode, we simulate result)
    // Actually, triggers DO run on Insert, so we can insert 0 balance and let Billing transactions update it.
    // However, for safety in demo, we'll just insert profiles first.

    profileBatch.push(profile);


    // --- Generate Behavior (Last 60 Days) ---
    // We simulate 2 months: Month -2 (Good), Month -1 (Current/Problematic)

    // A. Billing Transactions
    let currentBalance = 0;

    if (isRiskGroup) {
      // SCENARIO: Stopped paying recently
      // Month -2: Good behavior
      for (let k = 0; k < 3; k++) {
        billingBatch.push({
          user_id: userId,
          type: 'Topup',
          amount: 5000,
          currency: 'MMK',
          timestamp: new Date(Date.now() - (40 + k * 5) * 24 * 60 * 60 * 1000).toISOString()
        });
        currentBalance += 5000;
      }
      // Month -1: Stopped. Just burn rate.
      billingBatch.push({
        user_id: userId,
        type: 'Package_Purchase',
        amount: 14000, // Burn almost everything
        currency: 'MMK',
        timestamp: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString()
      });
      currentBalance -= 14000; // Left with tiny balance
    } else {
      // SCENARIO: Stable Payer
      // Regular Topups every 10 days
      for (let k = 0; k < 6; k++) {
        billingBatch.push({
          user_id: userId,
          type: 'Topup',
          amount: 10000,
          currency: 'MMK',
          timestamp: new Date(Date.now() - (k * 10 + 2) * 24 * 60 * 60 * 1000).toISOString()
        });
        currentBalance += 10000;
      }
      // Regular usage
      billingBatch.push({
        user_id: userId,
        type: 'Package_Purchase',
        amount: 15000,
        currency: 'MMK',
        timestamp: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
      });
      currentBalance -= 15000;
    }


    // B. Telecom Usage (DPI & Latency)
    // Generate 5 representative usage points per user for the chart
    for (let d = 0; d < 5; d++) {
      const daysAgo = getRandomInt(1, 60);
      const date = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

      // Default Healthy State
      let latency = getRandomInt(30, 60);
      let volume = getRandomInt(200, 800);
      let app = 'Facebook';

      if (isRiskGroup) {
        app = 'Mobile Legends';
        if (daysAgo < 30) {
          // Recent: LAG SPIKE & USAGE DROP
          latency = getRandomInt(250, 480); // Unplayable!
          volume = getRandomInt(0, 50);     // Rage quit / no usage
        } else {
          // Old: Heavy Gaming
          latency = getRandomInt(40, 60);
          volume = getRandomInt(1000, 3000);
        }
      }

      usageBatch.push({
        user_id: userId,
        type: 'Data',
        volume_mb: volume,
        duration_sec: 0,
        latency_ms: latency,
        metadata: { app_name: app, dni: 'sni.video' },
        timestamp: date.toISOString()
      });
    }


    // --- Flush Batches ---
    if (profileBatch.length >= BATCH_SIZE || i === USERS_TOTAL - 1) {
      // 1. Profiles
      const { error: pErr } = await supabase.from('profiles').insert(profileBatch);
      if (pErr) console.error('Error inserting profiles:', pErr.message);

      // 2. Billing (Calculates Revenue)
      const { error: bErr } = await supabase.from('billing_transactions').insert(billingBatch);
      if (bErr) console.error('Error inserting billing:', bErr.message);

      // 3. Usage (Calculates Latency Analytics)
      const { error: uErr } = await supabase.from('telecom_usage').insert(usageBatch);
      if (uErr) console.error('Error inserting usage:', uErr.message);

      // Reset
      profileBatch.length = 0;
      billingBatch.length = 0;
      usageBatch.length = 0;

      process.stdout.write(`\r✅ Processed ${i + 1} users...`);
    }
  }

  console.log('\n✨ Ultimate Data Seed Completed! Revenue & Latency Data Ready.');
  process.exit(0);
}

seed().catch(e => console.error(e));
