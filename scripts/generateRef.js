const crypto = require('crypto');

function generateHmacRef(userId, secretKey) {
    // 1. Get current timestamp in milliseconds
    const timestamp = Date.now().toString();
    
    // 2. Create the unique message payload
    const message = `${userId}-${timestamp}`;
    
    // 3. Generate the HMAC using SHA-256
    // The hex digest produces a string exactly 64 characters long
    const accountRef = crypto
        .createHmac('sha256', secretKey)
        .update(message)
        .digest('hex');
        
    return accountRef;
}

// --- Example Usage ---
// In production, fetch this from process.env.NOMBA_HMAC_SECRET
const SECRET_KEY = 'your_server_side_secret_key'; 
const USER_ID = 'user_994812';

const ref = generateHmacRef(USER_ID, SECRET_KEY);
console.log(ref);
console.log(`Length: ${ref.length} characters`); // Output: Exactly 64
