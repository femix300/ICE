import fs from 'fs';
const text = fs.readFileSync('pr_diff.txt', 'utf8');
const emojiRegex = /[\p{Extended_Pictographic}]/gu;
const match = text.match(emojiRegex);
if (match) {
  console.log('Emojis found:', match);
} else {
  console.log('No emojis found.');
}
