import { storage } from "../server/dbStorage";

async function cleanupOrphanedData() {
  console.log("Scanning for orphaned save game data...");
  
  const orphanedIds = await storage.findOrphanedSaveGameIds();
  
  if (orphanedIds.length === 0) {
    console.log("✓ No orphaned data found. Database is clean!");
    return;
  }
  
  console.log(`Found ${orphanedIds.length} orphaned save game ID(s): ${orphanedIds.join(", ")}`);
  console.log("Cleaning up...");
  
  let totalDeleted = 0;
  for (const saveGameId of orphanedIds) {
    const result = await storage.cleanupSaveGameData(saveGameId);
    console.log(`  - Deleted ${result.deletedRecords} records for saveGameId ${saveGameId}`);
    totalDeleted += result.deletedRecords;
  }
  
  console.log(`\n✓ Cleanup complete! Removed ${totalDeleted} orphaned records.`);
}

cleanupOrphanedData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error during cleanup:", error);
    process.exit(1);
  });
