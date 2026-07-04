import fs from 'fs';
import path from 'path';

const envFile = fs.readFileSync('.env', 'utf-8');
for (const line of envFile.split('\n')) {
  if (line.includes('=')) {
    const [key, ...rest] = line.split('=');
    process.env[key.trim()] = rest.join('=').trim();
  }
}

const url = process.env.TWENTY_API_URL + '/graphql';
const token = process.env.TWENTY_API_KEY;

async function createDemo() {
  console.log('Creating demo template...');
  try {
    const htmlSource = fs.readFileSync(path.join(__dirname, 'corporate_deal.html'), 'utf-8');
    
    const query = `
      mutation CreateDocumentTemplate($data: DocumentTemplateCreateInput!) {
        createDocumentTemplate(data: $data) {
          id
          name
        }
      }
    `;

    const variables = {
      data: {
        name: 'Corporate Deal Agreement (5 Pages)',
        htmlSource: htmlSource,
        boundObjectName: 'companies',
        allowedOutputTypes: ['HTML', 'PDF'],
        status: 'ACTIVE',
        version: 1
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query, variables })
    });

    const result = await response.json();
    
    if (result.errors) {
      console.error('GraphQL Errors:', JSON.stringify(result.errors, null, 2));
    } else {
      console.log('Created template:', result.data.createDocumentTemplate);
      console.log('Demo creation completed successfully.');
    }
  } catch (err) {
    console.error('Error during demo creation:', err);
  }
}

createDemo();
