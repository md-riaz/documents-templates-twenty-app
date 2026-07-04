import fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf-8');
for (const line of envFile.split('\n')) {
  if (line.includes('=')) {
    const [key, ...rest] = line.split('=');
    process.env[key.trim()] = rest.join('=').trim();
  }
}

const url = process.env.TWENTY_API_URL + '/graphql';
const token = process.env.TWENTY_API_KEY;

async function checkTemplate() {
  const query = `
    query {
      documentTemplates(filter: { name: { eq: "Corporate Deal Agreement (5 Pages)" } }) {
        edges {
          node {
            id
            name
            htmlSource
          }
        }
      }
    }
  `;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query })
  });

  const result = await response.json();
  console.log(JSON.stringify(result, null, 2));
}

checkTemplate();
