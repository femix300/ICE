const https = require('https');

const data = JSON.stringify({
  query: `query { issue(id: "ICE-30") { id title description } }`
});

const options = {
  hostname: 'api.linear.app',
  path: '/graphql',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'lin_api_c6f5x5su2egKhKXeskUXJHwKbrOSShKgCvQmuIAQ',
    'Content-Length': data.length
  }
};

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', (d) => body += d);
  res.on('end', () => console.log(body));
});

req.on('error', (e) => console.error(e));
req.write(data);
req.end();
