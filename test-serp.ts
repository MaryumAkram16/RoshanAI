import { fetchSalaryFromSERP } from './src/lib/serpAPI';

fetchSalaryFromSERP('Web3 Developer', '3-5 years', 'United States')
  .then(res => console.log('success', res))
  .catch(err => console.error('error', err));
