import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seedFeatures() {
  console.log("🌱 Seeding Extended Features (Recipes, Franchise, Equipment)...");

  // 1. Recipes
  const chaiItem = await prisma.item.findFirst({ where: { name: { contains: "Chai" } } });
  if (chaiItem) {
    await prisma.recipe.upsert({
      where: { itemId: chaiItem.id },
      update: {},
      create: {
        itemId: chaiItem.id,
        yieldCount: 1,
        instructions: "Boil water with crushed ginger & cardamom. Add tea powder, simmer for 2 mins, add milk and sugar. Bring to a rolling boil and strain.",
        ingredients: {
          create: [
            { ingredientName: "Full Cream Milk", unit: "ml", quantity: 100, costPerUnit: 0.06 },
            { ingredientName: "Assam CTC Tea Powder", unit: "g", quantity: 5, costPerUnit: 0.40 },
            { ingredientName: "Refined Sugar", unit: "g", quantity: 10, costPerUnit: 0.045 },
            { ingredientName: "Elaichi & Adrak Mix", unit: "g", quantity: 3, costPerUnit: 0.35 },
            { ingredientName: "Paper Cup 150ml", unit: "pcs", quantity: 1, costPerUnit: 0.85 },
          ],
        },
      },
    });
    console.log("  ✓ Created Recipe for", chaiItem.name);
  }

  const rollItem = await prisma.item.findFirst({ where: { name: { contains: "Roll" } } });
  if (rollItem) {
    await prisma.recipe.upsert({
      where: { itemId: rollItem.id },
      update: {},
      create: {
        itemId: rollItem.id,
        yieldCount: 1,
        instructions: "Griddle fresh paratha with oil. Grill paneer/filling on high flame with tikka sauce. Wrap in paper with mint chutney.",
        ingredients: {
          create: [
            { ingredientName: "Lachha Paratha Sheet", unit: "pcs", quantity: 1, costPerUnit: 8.50 },
            { ingredientName: "Fresh Paneer Cubes", unit: "g", quantity: 70, costPerUnit: 0.38 },
            { ingredientName: "Tikka Marinade & Spices", unit: "g", quantity: 20, costPerUnit: 0.25 },
            { ingredientName: "Onion & Green Capsicum", unit: "g", quantity: 30, costPerUnit: 0.08 },
            { ingredientName: "Food Wrap Foil & Butter Paper", unit: "pcs", quantity: 1, costPerUnit: 1.20 },
          ],
        },
      },
    });
    console.log("  ✓ Created Recipe for", rollItem.name);
  }

  const momoItem = await prisma.item.findFirst({ where: { name: { contains: "Momo" } } });
  if (momoItem) {
    await prisma.recipe.upsert({
      where: { itemId: momoItem.id },
      update: {},
      create: {
        itemId: momoItem.id,
        yieldCount: 1,
        instructions: "Steam dumplings in commercial steamer for 8 mins. Serve hot with red chili garlic chutney and mayo.",
        ingredients: {
          create: [
            { ingredientName: "Momo Dumplings (Pre-rolled)", unit: "pcs", quantity: 6, costPerUnit: 2.20 },
            { ingredientName: "Red Chili Garlic Chutney", unit: "g", quantity: 35, costPerUnit: 0.12 },
            { ingredientName: "Mayonnaise Dip", unit: "g", quantity: 25, costPerUnit: 0.15 },
            { ingredientName: "Eco Meal Box", unit: "pcs", quantity: 1, costPerUnit: 2.50 },
          ],
        },
      },
    });
    console.log("  ✓ Created Recipe for", momoItem.name);
  }

  // 2. Franchise Data on Kiosks
  const kiosks = await prisma.kiosk.findMany({ take: 3 });
  if (kiosks.length >= 2) {
    await prisma.kiosk.update({
      where: { id: kiosks[1].id },
      data: {
        modelType: "FOCO",
        royaltyPercent: 8.0,
        franchiseOwnerName: "Rohan Mehra",
        franchiseOwnerPhone: "9811223344",
      },
    });

    const now = new Date();
    await prisma.franchisePayout.upsert({
      where: {
        kioskId_month_year: {
          kioskId: kiosks[1].id,
          month: now.getMonth() === 0 ? 12 : now.getMonth(),
          year: now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear(),
        },
      },
      update: {},
      create: {
        kioskId: kiosks[1].id,
        month: now.getMonth() === 0 ? 12 : now.getMonth(),
        year: now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear(),
        grossSales: 185000,
        netSales: 176190,
        royaltyAmount: 14095.20,
        status: "PAID",
        paidAt: new Date(),
        notes: "Settled via NEFT Ref: HDFC993821038",
      },
    });
    console.log("  ✓ Configured FOCO Franchise for", kiosks[1].name);
  }

  if (kiosks.length >= 3) {
    await prisma.kiosk.update({
      where: { id: kiosks[2].id },
      data: {
        modelType: "FOFO",
        royaltyPercent: 6.0,
        franchiseOwnerName: "Pooja Sharma",
        franchiseOwnerPhone: "9822334455",
      },
    });
    console.log("  ✓ Configured FOFO Franchise for", kiosks[2].name);
  }

  // 3. Equipment & Maintenance
  if (kiosks.length > 0) {
    const k1 = kiosks[0];
    const in180Days = new Date(Date.now() + 180 * 86400000);
    const in360Days = new Date(Date.now() + 360 * 86400000);

    const teaDispenser = await prisma.equipment.create({
      data: {
        kioskId: k1.id,
        name: "Commercial Tea Maker & Boiler 10L",
        brand: "ChaiMaster Pro",
        serialNumber: "CMP-2026-X88",
        purchaseDate: new Date("2026-01-15"),
        warrantyExpiry: in180Days,
        amcExpiry: in360Days,
        status: "OPERATIONAL",
        logs: {
          create: [
            {
              issue: "Heating element descaling & routine servicing",
              cost: 650,
              technician: "Ramesh Sharma (ChaiMaster Service)",
              resolvedAt: new Date(),
              status: "RESOLVED",
            },
          ],
        },
      },
    });

    await prisma.equipment.create({
      data: {
        kioskId: k1.id,
        name: "Double Tank Commercial Deep Fryer 12L",
        brand: "FryKing Electric",
        serialNumber: "FK-12L-4091",
        purchaseDate: new Date("2026-02-10"),
        warrantyExpiry: in180Days,
        amcExpiry: in360Days,
        status: "OPERATIONAL",
      },
    });

    if (kiosks.length > 1) {
      await prisma.equipment.create({
        data: {
          kioskId: kiosks[1].id,
          name: "Under-Counter Display Chiller 220L",
          brand: "Voltas Commercial",
          serialNumber: "VOL-REF-902",
          purchaseDate: new Date("2025-11-20"),
          warrantyExpiry: new Date("2026-11-20"),
          amcExpiry: new Date("2026-05-15"),
          status: "NEEDS_REPAIR",
          logs: {
            create: [
              {
                issue: "Cooling temperature fluctuating above 8°C",
                cost: 0,
                technician: "Voltas Authorized Center",
                status: "OPEN",
              },
            ],
          },
        },
      });
    }
    console.log("  ✓ Created Equipment records & maintenance logs");
  }

  console.log("✅ Extended features seeded successfully!");
}

seedFeatures()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
