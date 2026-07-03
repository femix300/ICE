const fs = require('fs');
const comments = JSON.parse(fs.readFileSync('pr_issue_comments.json', 'utf8'));
comments.forEach(c => {
  if (c.user.login === 'femix300') {
    console.log(`\n--- Comment on issue ${c.issue_url} ---\n${c.body}\n`);
  }
});
