const http = require('http');

async function testDeposit() {
  const loginRes = await fetch('http://localhost:3001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '+251911234567', password: 'password123' })
  });
  
  const token = loginRes.headers.get('set-cookie')?.split(';')[0];
  const authData = await loginRes.json();
  console.log('Login status:', loginRes.status);
  
  if (!token) {
    console.error('No token received');
    return;
  }
  
  // Get wallets
  const walletsRes = await fetch('http://localhost:3001/api/wallets', {
    headers: { 'Cookie': token }
  });
  const wallets = await walletsRes.json();
  const primary = wallets.find(w => !w.isFamily);
  
  console.log('Primary wallet:', primary?.id);
  
  // Try deposit
  const depositRes = await fetch('http://localhost:3001/api/transactions/deposit', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Cookie': token
    },
    body: JSON.stringify({
      walletId: primary.id,
      amount: 500,
      description: 'Test deposit',
      method: 'TELEBIRR',
      holidayId: null,
      idempotencyKey: crypto.randomUUID()
    })
  });
  
  const depositData = await depositRes.json();
  console.log('Deposit Response Status:', depositRes.status);
  console.log('Deposit Response Body:', depositData);
}

testDeposit().catch(console.error);
