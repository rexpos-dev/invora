const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
    console.log('Starting data import from prisma/data_export.json...');

    const dataPath = path.join(__dirname, '..', 'prisma', 'data_export.json');
    if (!fs.existsSync(dataPath)) {
        console.error('Data file not found at:', dataPath);
        process.exit(1);
    }

    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

    // Defined order to satisfy foreign key constraints
    const tables = [
        { key: 'role', model: 'role' },
        { key: 'branch', model: 'branch' },
        { key: 'user', model: 'user' },
        { key: 'customer', model: 'customer' },
        { key: 'batch', model: 'batch' },
        { key: 'productCategory', model: 'productCategory' },
        { key: 'warehouseProduct', model: 'warehouseProduct' },
        { key: 'product', model: 'product' },
        { key: 'order', model: 'order' },
        { key: 'preOrder', model: 'preOrder' },
        { key: 'preOrderItem', model: 'preOrderItem' },
        { key: 'inventoryLog', model: 'inventoryLog' },
        { key: 'salesLog', model: 'salesLog' },
        { key: 'notification', model: 'notification' },
        { key: 'message', model: 'message' },
        { key: 'station', model: 'station' },
        { key: 'archiveData', model: 'archiveData' },
        { key: 'databaseOperation', model: 'databaseOperation' },
        { key: 'adminLog', model: 'adminLog' }
    ];

    try {
        for (const table of tables) {
            const records = data[table.key] || [];
            console.log(`Importing ${records.length} records into ${table.model}...`);

            if (records.length === 0) continue;

            // Use chunking to avoid memory issues and connection timeouts
            const chunkSize = 100;
            for (let i = 0; i < records.length; i += chunkSize) {
                const chunk = records.slice(i, i + chunkSize);

                await Promise.all(chunk.map(async (record) => {
                    // Convert date strings to Date objects
                    const processedRecord = { ...record };
                    for (const key in processedRecord) {
                        if (typeof processedRecord[key] === 'string' &&
                            (processedRecord[key].match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/) ||
                                key.toLowerCase().includes('date') ||
                                key === 'createdAt' ||
                                key === 'updatedAt')) {

                            const dateValue = new Date(processedRecord[key]);
                            if (!isNaN(dateValue.getTime())) {
                                processedRecord[key] = dateValue;
                            }
                        }
                    }

                    try {
                        await prisma[table.model].upsert({
                            where: { id: processedRecord.id },
                            update: processedRecord,
                            create: processedRecord
                        });
                    } catch (err) {
                        console.warn(`Failed to import record ${record.id} in ${table.model}:`, err.message);
                    }
                }));
            }
        }

        console.log('\n✅ Data import completed!');

        // Reset PostgreSQL sequences
        console.log('Resetting sequences...');
        const sequenceTables = [
            'customers', 'orders', 'notifications', 'batches',
            'product_categories', 'products', 'users', 'messages',
            'branches', 'roles', 'archive_data', 'stations',
            'warehouse_products', 'database_operations', 'sales_logs',
            'admin_logs', 'pre_orders', 'pre_order_items', 'inventory_logs'
        ];

        for (const tableName of sequenceTables) {
            try {
                const query = `SELECT setval(pg_get_serial_sequence('"${tableName}"', 'id'), coalesce(max(id), 1), max(id) IS NOT null) FROM "${tableName}";`;
                await prisma.$executeRawUnsafe(query);
                console.log(`✓ Reset sequence for ${tableName}`);
            } catch (err) {
                console.warn(`Failed to reset sequence for ${tableName}:`, err.message);
            }
        }

        console.log('\n✅ All sequences reset successfully!');

    } catch (error) {
        console.error('❌ Data import failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
