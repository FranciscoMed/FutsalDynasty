/**
 * Test UEFA API Response
 * Quick script to inspect the actual API response structure
 */

import { SmartFetcher } from './utils/rate-limiter';
import { Logger } from './utils/logger';

const logger = new Logger('APITest');

async function testAPI() {
  const url = 'https://match.uefa.com/v5/matches?competitionId=27&fromDate=2024-09-01&limit=10&offset=0&order=ASC&phase=ALL&seasonYear=2025&toDate=2025-07-30&utcOffset=0';
  
  logger.info('Testing UEFA API...');
  logger.info(`URL: ${url}`);
  
  const fetcher = new SmartFetcher(2, 3, 1000);
  
  try {
    const response = await fetcher.fetch<any>(url);
    
    logger.info('\nAPI Response:');
    console.log(JSON.stringify(response, null, 2));
    
    logger.info('\nResponse keys:', Object.keys(response));
    
    if (response.matches) {
      logger.info(`Found ${response.matches.length} matches`);
    } else {
      logger.warn('No "matches" property in response');
    }
    
  } catch (error) {
    logger.error('API test failed:', error);
  }
}

testAPI();
