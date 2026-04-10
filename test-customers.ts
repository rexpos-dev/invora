import { getCustomers } from './src/app/(app)/customers/actions';

async function test() {
    try {
        console.log('Testing getCustomers...');
        const customers = await getCustomers();
        console.log('Success! Fetched', customers.length, 'customers');
    } catch (error) {
        console.error('Caught error:', error);
    }
}

test();
