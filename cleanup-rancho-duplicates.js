#!/usr/bin/env node

/**
 * Cleanup Utility for Rancho Mission Viejo Duplicate Tasks
 * This script identifies and removes duplicate/extra instances
 */

// IDs of the 18 extra instances that should be removed
const EXTRA_INSTANCE_IDS = [
  '67776e9b-1077-4df2-a4d3-1e8428831689', // 2025-11-07
  'e0df4585-bb31-4f3e-b7f2-f3626c0643da', // 2025-11-08
  '9fb2323b-e419-4072-ade0-b90c6929c35c', // 2025-11-12
  'b1457dcf-6fdc-46ae-9284-c1ce9ec396c3', // 2025-11-13 (duplicate)
  '651c9ead-9d4d-4860-9c17-4d15ad08340a', // 2025-11-13 (duplicate - keep the other one)
  'b40f4a4b-3a46-4f88-aa1a-72bf23a5a61b', // 2025-11-14 (duplicate)
  'b617e3b6-0c48-4911-adcf-98b4921409d0', // 2025-11-14 (duplicate - keep the other one)
  '1116232f-9487-4770-9d67-cfcf89647180', // 2025-11-15
  '7dc06756-2f23-43b6-9804-54855b7f4ae3', // 2025-11-19
  'a67292b5-dcfa-40a9-88be-1198981086cd', // 2025-11-20 (duplicate)
  '6ef618f0-921b-467d-b858-63e8b3966d20', // 2025-11-20 (duplicate - keep the other one)
  '27a2bf85-afc6-423c-b095-94a2bd53d0ff', // 2025-11-21 (duplicate)
  'f4a83fff-fe37-4829-8e60-27198b6dff21', // 2025-11-21 (duplicate - keep the other one)
  'f4932a87-8154-4025-a6c7-97b3a0a8d8c3', // 2025-11-22
  'bbd08dac-3a24-421d-9411-0a2a8756739e', // 2025-11-26
  'aef84566-0385-4e92-9298-79b9565e78ce', // 2025-11-27 (duplicate)
  '7eeaf768-8151-4e34-817b-9a154cc826ae', // 2025-11-27 (duplicate - keep the other one)
  'a146d411-fafb-4275-8a99-65a34e77b17b'  // 2025-11-28 (duplicate - keep the other one)
];

console.log('🧹 Rancho Mission Viejo Cleanup Utility');
console.log('=====================================');
console.log(`Found ${EXTRA_INSTANCE_IDS.length} extra instances to remove`);
console.log('\nExtra instance IDs:');
EXTRA_INSTANCE_IDS.forEach((id, index) => {
  console.log(`  ${index + 1}. ${id}`);
});

console.log('\n⚠️  This script lists the IDs to be removed.');
console.log('⚠️  To actually delete them, use the Database page bulk delete feature.');
console.log('\n📋 Copy these IDs and use them in the Database page:');
console.log(JSON.stringify(EXTRA_INSTANCE_IDS, null, 2));

