const fetch = require('node-fetch');

const API_URL = "https://twenty.opc.mdriaz.com.bd";
const API_KEY = "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IjdiMzg3ZDA5LWIxN2EtNDk2Ny05MjU2LWRiMjMxZDFlMjcyOSJ9.eyJzdWIiOiJhMGIxYmUxZC00MWY2LTQ1YjctYmEzMC0zNGQyNDg3N2FmNjIiLCJ0eXBlIjoiQVBJX0tFWSIsIndvcmtzcGFjZUlkIjoiYTBiMWJlMWQtNDFmNi00NWI3LWJhMzAtMzRkMjQ4NzdhZjYyIiwiaWF0IjoxNzgyODc4Nzc3LCJleHAiOjE3OTA2NTQ3NzYsImp0aSI6IjgzNTg1NzVmLTM3OTItNDRkYy05NjQ5LTE2ZDZhYTI5NmNiNCJ9.gb7-f5IX2_SONshK9WY7A8iGjiimkbsePpfsCwjlcYm4LtdmwEnXCZdX34MjK38CnqYBNIQX9CoA-_NYE1XLig";

async function run() {
  const query = `
    query {
      findManyFieldMetadata(filter: { id: { isNotNull: true } }) {
        id
        name
        type
        objectMetadataId
      }
    }
  `;

  try {
    const res = await fetch(`${API_URL}/metadata`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`
      },
      body: JSON.stringify({ query })
    });
    const json = await res.json();
    console.log(JSON.stringify(json, null, 2));
  } catch(e) {
    console.error(e);
  }
}
run();
