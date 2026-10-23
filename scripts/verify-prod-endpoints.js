const http = require('http');

async function testEndpoint(url) {
  const res = await fetch(url);
  const text = await res.text();
  return {
    status: res.status,
    headers: Object.fromEntries(res.headers.entries()),
    body: text
  };
}

async function main() {
  console.log('=== Verifying Production Server Endpoints ===');

  // 1. Health check
  const healthResult = await testEndpoint('http://localhost:5001/api/health');
  console.log('Health Endpoint Status:', healthResult.status);
  console.log('Health Endpoint Body:', healthResult.body);

  let healthJson;
  try {
    healthJson = JSON.parse(healthResult.body);
  } catch (e) {
    console.error('Failed to parse health response as JSON:', e.message);
  }

  // 2. Root React app check
  const rootResult = await testEndpoint('http://localhost:5001/');
  console.log('Root Endpoint Status:', rootResult.status);
  console.log('Root Content-Type:', rootResult.headers['content-type']);
  console.log('Root Contains id="root":', rootResult.body.includes('id="root"'));
  console.log('Root Contains Vite script:', rootResult.body.includes('assets/index-'));
  console.log('Root First 200 chars:\n', rootResult.body.slice(0, 200));

  const healthSuccess = healthResult.status === 200 && healthJson && healthJson.status === 'ok';
  const rootSuccess = rootResult.status === 200 && rootResult.body.includes('id="root"');

  console.log('\n--- VERIFICATION SUMMARY ---');
  console.log('Health check success:', healthSuccess);
  console.log('Root serves React app:', rootSuccess);

  if (healthSuccess && rootSuccess) {
    console.log('ALL CHECKS PASSED!');
  } else {
    console.error('CHECKS FAILED!');
    process.exitCode = 1;
  }
}

main().catch(err => {
  console.error('Fatal error during test:', err);
  process.exit(1);
});
