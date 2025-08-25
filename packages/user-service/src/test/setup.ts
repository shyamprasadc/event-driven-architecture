import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Global test setup
beforeAll(async () => {
    // Setup test database connections if needed
});

afterAll(async () => {
    // Cleanup test database connections if needed
});

// Global test utilities
global.console = {
    ...console,
    // Uncomment to suppress console.log during tests
    // log: jest.fn(),
    // debug: jest.fn(),
    // info: jest.fn(),
    // warn: jest.fn(),
    // error: jest.fn(),
};
