import { PrismaClient, UserRole, ItemCategory, SeasonType, PaymentMode, DispatchStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding Kiosk ERP database...");

  // ── Clean existing data (order matters due to FK constraints) ──
  console.log("Cleaning existing data...");
  await prisma.reconItem.deleteMany();
  await prisma.reconciliation.deleteMany();
  await prisma.billItem.deleteMany();
  await prisma.bill.deleteMany();
  await prisma.dispatchItem.deleteMany();
  await prisma.dispatch.deleteMany();
  await prisma.advance.deleteMany();
  await prisma.salaryRecord.deleteMany();
  await prisma.menuTemplateItem.deleteMany();
  await prisma.kiosk.deleteMany();
  await prisma.menuTemplate.deleteMany();
  await prisma.season.deleteMany();
  await prisma.itemVariant.deleteMany();
  await prisma.item.deleteMany();
  await prisma.user.deleteMany();

  // ── 1. Users ──
  console.log("Creating users...");
  const owner = await prisma.user.create({
    data: { name: "Rajesh Kumar", phone: "9876543210", role: UserRole.OWNER },
  });
  const manager = await prisma.user.create({
    data: { name: "Amit Sharma", phone: "9876543211", role: UserRole.MANAGER },
  });
  const operators = await Promise.all([
    prisma.user.create({ data: { name: "Ravi", phone: "9876543212", role: UserRole.OPERATOR } }),
    prisma.user.create({ data: { name: "Suresh", phone: "9876543213", role: UserRole.OPERATOR } }),
    prisma.user.create({ data: { name: "Mohan", phone: "9876543214", role: UserRole.OPERATOR } }),
    prisma.user.create({ data: { name: "Vikram", phone: "9876543215", role: UserRole.OPERATOR } }),
    prisma.user.create({ data: { name: "Deepak", phone: "9876543216", role: UserRole.OPERATOR } }),
  ]);
  const [ravi, suresh, mohan, vikram, deepak] = operators;
  console.log(`  Created ${2 + operators.length} users`);

  // ── 2. Items ──
  console.log("Creating items...");
  const itemData = [
    // FOOD
    { name: "Veg Momos", unit: "pcs", costPrice: 3, sellPrice: 10, category: ItemCategory.FOOD, dailyMargin: 15, seasonTags: [SeasonType.WINTER], isPerishable: true, shelfLifeHrs: 8 },
    { name: "Chicken Momos", unit: "pcs", costPrice: 5, sellPrice: 15, category: ItemCategory.FOOD, dailyMargin: 10, seasonTags: [SeasonType.WINTER], isPerishable: true, shelfLifeHrs: 6 },
    { name: "Steam Momos", unit: "pcs", costPrice: 3, sellPrice: 10, category: ItemCategory.FOOD, dailyMargin: 10, seasonTags: [SeasonType.WINTER], isPerishable: true, shelfLifeHrs: 6 },
    { name: "Shawarma Roll", unit: "pcs", costPrice: 25, sellPrice: 80, category: ItemCategory.FOOD, dailyMargin: 3, seasonTags: [SeasonType.ALL_YEAR], isPerishable: true, shelfLifeHrs: 4 },
    { name: "Paneer Shawarma", unit: "pcs", costPrice: 30, sellPrice: 90, category: ItemCategory.FOOD, dailyMargin: 3, seasonTags: [SeasonType.ALL_YEAR], isPerishable: true, shelfLifeHrs: 4 },
    { name: "Golgappe", unit: "plates", costPrice: 5, sellPrice: 30, category: ItemCategory.FOOD, dailyMargin: 5, seasonTags: [SeasonType.SUMMER], isPerishable: true, shelfLifeHrs: 4 },
    { name: "Fruit Chaat", unit: "plates", costPrice: 15, sellPrice: 50, category: ItemCategory.FOOD, dailyMargin: 3, seasonTags: [SeasonType.SUMMER], isPerishable: true, shelfLifeHrs: 3 },
    { name: "Aloo Tikki", unit: "pcs", costPrice: 5, sellPrice: 20, category: ItemCategory.FOOD, dailyMargin: 5, seasonTags: [SeasonType.ALL_YEAR], isPerishable: true, shelfLifeHrs: 6 },
    { name: "Pakora Mix", unit: "plates", costPrice: 8, sellPrice: 30, category: ItemCategory.FOOD, dailyMargin: 5, seasonTags: [SeasonType.MONSOON], isPerishable: true, shelfLifeHrs: 4 },
    { name: "Spring Roll", unit: "pcs", costPrice: 8, sellPrice: 25, category: ItemCategory.FOOD, dailyMargin: 5, seasonTags: [SeasonType.ALL_YEAR], isPerishable: true, shelfLifeHrs: 6 },
    // BEVERAGE
    { name: "Fresh Orange Juice", unit: "glass", costPrice: 15, sellPrice: 50, category: ItemCategory.BEVERAGE, dailyMargin: 3, seasonTags: [SeasonType.SUMMER], isPerishable: true, shelfLifeHrs: 2 },
    { name: "Mango Shake", unit: "glass", costPrice: 20, sellPrice: 60, category: ItemCategory.BEVERAGE, dailyMargin: 2, seasonTags: [SeasonType.SUMMER], isPerishable: true, shelfLifeHrs: 2 },
    { name: "Masala Chai", unit: "cups", costPrice: 3, sellPrice: 15, category: ItemCategory.BEVERAGE, dailyMargin: 10, seasonTags: [SeasonType.WINTER], isPerishable: true, shelfLifeHrs: 1 },
    { name: "Cold Coffee", unit: "glass", costPrice: 15, sellPrice: 50, category: ItemCategory.BEVERAGE, dailyMargin: 3, seasonTags: [SeasonType.SUMMER], isPerishable: true, shelfLifeHrs: 2 },
    { name: "Lemonade", unit: "glass", costPrice: 5, sellPrice: 25, category: ItemCategory.BEVERAGE, dailyMargin: 5, seasonTags: [SeasonType.SUMMER], isPerishable: true, shelfLifeHrs: 3 },
    // SUPPLY
    { name: "Napkins", unit: "packs", costPrice: 20, sellPrice: 0, category: ItemCategory.SUPPLY, dailyMargin: 0, seasonTags: [SeasonType.ALL_YEAR], isPerishable: false },
    { name: "Sauce Sachets", unit: "pcs", costPrice: 1, sellPrice: 0, category: ItemCategory.SUPPLY, dailyMargin: 0, seasonTags: [SeasonType.ALL_YEAR], isPerishable: false },
    // PACKAGING
    { name: "Plates", unit: "pcs", costPrice: 1.5, sellPrice: 0, category: ItemCategory.PACKAGING, dailyMargin: 0, seasonTags: [SeasonType.ALL_YEAR], isPerishable: false },
    { name: "Cups", unit: "pcs", costPrice: 2, sellPrice: 0, category: ItemCategory.PACKAGING, dailyMargin: 0, seasonTags: [SeasonType.ALL_YEAR], isPerishable: false },
    { name: "Takeaway Boxes", unit: "pcs", costPrice: 3, sellPrice: 0, category: ItemCategory.PACKAGING, dailyMargin: 0, seasonTags: [SeasonType.ALL_YEAR], isPerishable: false },
  ];

  const items: Record<string, Awaited<ReturnType<typeof prisma.item.create>>> = {};
  for (const data of itemData) {
    const item = await prisma.item.create({ data });
    items[item.name] = item;
  }
  console.log(`  Created ${Object.keys(items).length} items`);

  // ── 3. Seasons ──
  console.log("Creating seasons...");
  const winterSeason = await prisma.season.create({
    data: {
      name: "Winter 2025-26",
      type: SeasonType.WINTER,
      startDate: new Date("2025-11-01"),
      endDate: new Date("2026-02-28"),
      isActive: true,
    },
  });
  const summerSeason = await prisma.season.create({
    data: {
      name: "Summer 2026",
      type: SeasonType.SUMMER,
      startDate: new Date("2026-03-01"),
      endDate: new Date("2026-06-30"),
      isActive: false,
    },
  });
  console.log("  Created 2 seasons");

  // ── 4. Menu Templates ──
  console.log("Creating menu templates...");
  const winterMomoKit = await prisma.menuTemplate.create({
    data: {
      name: "Winter Momo Kit",
      kioskType: "Momo",
      seasonId: winterSeason.id,
      items: {
        create: [
          { itemId: items["Veg Momos"].id, defaultQty: 500 },
          { itemId: items["Chicken Momos"].id, defaultQty: 200 },
          { itemId: items["Steam Momos"].id, defaultQty: 200 },
          { itemId: items["Plates"].id, defaultQty: 200 },
          { itemId: items["Sauce Sachets"].id, defaultQty: 300 },
          { itemId: items["Napkins"].id, defaultQty: 5 },
          { itemId: items["Takeaway Boxes"].id, defaultQty: 50 },
        ],
      },
    },
  });

  const summerJuiceKit = await prisma.menuTemplate.create({
    data: {
      name: "Summer Juice Kit",
      kioskType: "Juice",
      seasonId: summerSeason.id,
      items: {
        create: [
          { itemId: items["Fresh Orange Juice"].id, defaultQty: 100 },
          { itemId: items["Mango Shake"].id, defaultQty: 80 },
          { itemId: items["Lemonade"].id, defaultQty: 120 },
          { itemId: items["Cold Coffee"].id, defaultQty: 60 },
          { itemId: items["Cups"].id, defaultQty: 200 },
          { itemId: items["Napkins"].id, defaultQty: 5 },
        ],
      },
    },
  });

  const multiCuisineKit = await prisma.menuTemplate.create({
    data: {
      name: "Multi-Cuisine Kit",
      kioskType: "Multi",
      items: {
        create: [
          { itemId: items["Shawarma Roll"].id, defaultQty: 100 },
          { itemId: items["Paneer Shawarma"].id, defaultQty: 50 },
          { itemId: items["Aloo Tikki"].id, defaultQty: 100 },
          { itemId: items["Spring Roll"].id, defaultQty: 80 },
          { itemId: items["Plates"].id, defaultQty: 200 },
          { itemId: items["Sauce Sachets"].id, defaultQty: 200 },
          { itemId: items["Napkins"].id, defaultQty: 5 },
          { itemId: items["Takeaway Boxes"].id, defaultQty: 50 },
        ],
      },
    },
  });
  console.log("  Created 3 menu templates");

  // ── 5. Kiosks ──
  console.log("Creating kiosks...");
  const kiosks = await Promise.all([
    prisma.kiosk.create({
      data: {
        name: "Momo Point",
        type: "Momo",
        location: "Sector 18, Noida",
        operatorId: ravi.id,
        managerId: manager.id,
        activeTemplateId: winterMomoKit.id,
      },
    }),
    prisma.kiosk.create({
      data: {
        name: "Shawarma King",
        type: "Multi",
        location: "GIP Mall, Noida",
        operatorId: suresh.id,
        managerId: manager.id,
        activeTemplateId: multiCuisineKit.id,
      },
    }),
    prisma.kiosk.create({
      data: {
        name: "Juice Junction",
        type: "Juice",
        location: "Sector 62, Noida",
        operatorId: mohan.id,
        activeTemplateId: summerJuiceKit.id,
      },
    }),
    prisma.kiosk.create({
      data: {
        name: "Chaat Corner",
        type: "Multi",
        location: "Sector 15, Noida",
        operatorId: vikram.id,
        activeTemplateId: multiCuisineKit.id,
      },
    }),
    prisma.kiosk.create({
      data: {
        name: "Food Hub",
        type: "Momo",
        location: "Indirapuram, Ghaziabad",
        operatorId: deepak.id,
        managerId: manager.id,
        activeTemplateId: winterMomoKit.id,
      },
    }),
  ]);
  const momoPoint = kiosks[0];
  console.log(`  Created ${kiosks.length} kiosks`);

  // ── 6. Sample dispatches, bills, and reconciliations (past 3 days for Momo Point) ──
  console.log("Creating sample dispatches, bills, and reconciliations...");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Dispatch template quantities for Momo Point
  const dispatchTemplate = [
    { item: items["Veg Momos"], qty: 500 },
    { item: items["Chicken Momos"], qty: 200 },
    { item: items["Steam Momos"], qty: 200 },
    { item: items["Plates"], qty: 200 },
    { item: items["Sauce Sachets"], qty: 300 },
  ];

  // Food items only (for bills and reconciliation)
  const foodDispatchItems = dispatchTemplate.filter(
    (d) => d.item.category === ItemCategory.FOOD || d.item.category === ItemCategory.BEVERAGE
  );

  for (let daysAgo = 3; daysAgo >= 1; daysAgo--) {
    const date = new Date(today);
    date.setDate(date.getDate() - daysAgo);

    // Create dispatch
    const dispatch = await prisma.dispatch.create({
      data: {
        date,
        status: DispatchStatus.RECONCILED,
        kioskId: momoPoint.id,
        createdById: manager.id,
        notes: `Daily dispatch for Momo Point`,
        items: {
          create: dispatchTemplate.map((d) => ({
            itemId: d.item.id,
            quantity: d.qty,
          })),
        },
      },
    });

    // Create 3-5 bills per day
    const billCount = 3 + Math.floor(Math.random() * 3); // 3, 4, or 5
    const billItems: Array<{ itemId: string; qty: number; unitPrice: number }> = [];

    for (let b = 0; b < billCount; b++) {
      const paymentMode = b % 2 === 0 ? PaymentMode.CASH : PaymentMode.UPI;
      // Pick 2-3 food items randomly for each bill
      const numItems = 2 + Math.floor(Math.random() * 2);
      const selectedItems = [...foodDispatchItems]
        .sort(() => Math.random() - 0.5)
        .slice(0, numItems);

      const currentBillItems = selectedItems.map((si) => {
        // Random quantity: 10-60 pcs per bill line
        const qty = 10 + Math.floor(Math.random() * 51);
        return {
          itemId: si.item.id,
          quantity: qty,
          unitPrice: si.item.sellPrice,
          lineTotal: qty * si.item.sellPrice,
        };
      });

      const total = currentBillItems.reduce((sum, bi) => sum + bi.lineTotal, 0);

      await prisma.bill.create({
        data: {
          date,
          total,
          paymentMode,
          kioskId: momoPoint.id,
          operatorId: ravi.id,
          items: {
            create: currentBillItems,
          },
        },
      });

      for (const bi of currentBillItems) {
        billItems.push({ itemId: bi.itemId, qty: bi.quantity, unitPrice: bi.unitPrice });
      }
    }

    // Create reconciliation
    // For each dispatched item, compute sold/returned/wasted
    let totalLoss = 0;
    const reconItemsData = dispatchTemplate.map((d, idx) => {
      const dispatched = d.qty;
      const isFood = d.item.category === ItemCategory.FOOD;

      if (!isFood) {
        // Supplies/packaging: all used, no loss tracking
        return {
          itemId: d.item.id,
          dispatched,
          sold: 0,
          returned: 0,
          wasted: 0,
          allowedMargin: d.item.dailyMargin,
          chargeableLoss: 0,
          lossAmount: 0,
        };
      }

      // Food items: 85-95% sold, 2-5% returned, rest wasted
      const soldPct = 0.85 + Math.random() * 0.1;
      const returnedPct = 0.02 + Math.random() * 0.03;
      const sold = Math.round(dispatched * soldPct);
      const returned = Math.round(dispatched * returnedPct);
      const wasted = dispatched - sold - returned;

      const allowedMargin = d.item.dailyMargin;

      // Make the first food item (Veg Momos) exceed margin to show a loss
      let chargeableLoss: number;
      if (idx === 0) {
        // Force wasted > margin
        const forcedWasted = allowedMargin + 10 + Math.floor(Math.random() * 10);
        const forcedSold = dispatched - returned - forcedWasted;
        const actualWasted = forcedWasted;
        chargeableLoss = Math.max(0, actualWasted - allowedMargin);
        const lossAmount = chargeableLoss * d.item.costPrice;
        totalLoss += lossAmount;
        return {
          itemId: d.item.id,
          dispatched,
          sold: forcedSold,
          returned,
          wasted: actualWasted,
          allowedMargin,
          chargeableLoss,
          lossAmount,
        };
      }

      chargeableLoss = Math.max(0, wasted - allowedMargin);
      const lossAmount = chargeableLoss * d.item.costPrice;
      totalLoss += lossAmount;

      return {
        itemId: d.item.id,
        dispatched,
        sold,
        returned,
        wasted,
        allowedMargin,
        chargeableLoss,
        lossAmount,
      };
    });

    await prisma.reconciliation.create({
      data: {
        date,
        status: "COMPLETED",
        totalLoss,
        kioskId: momoPoint.id,
        dispatchId: dispatch.id,
        operatorId: ravi.id,
        notes: totalLoss > 0 ? `Loss of Rs ${totalLoss.toFixed(2)} recorded` : "No chargeable loss",
        items: {
          create: reconItemsData,
        },
      },
    });

    console.log(`  Day -${daysAgo}: dispatch + ${billCount} bills + reconciliation (loss: Rs ${totalLoss.toFixed(2)})`);
  }

  console.log("\nSeeding complete!");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
