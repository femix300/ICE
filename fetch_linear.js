const apiKey = "lin_api_c6f5x5su2egKhKXeskUXJHwKbrOSShKgCvQmuIAQ";
const query = `
query {
  issues(filter: { title: { contains: "M0" } }) {
    nodes {
      identifier
      title
      description
    }
  }
}
`;
fetch("https://api.linear.app/graphql", {
  method: "POST",
  headers: {
    "Authorization": apiKey,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ query })
})
.then(res => res.json())
.then(data => console.log(JSON.stringify(data, null, 2)))
.catch(console.error);
