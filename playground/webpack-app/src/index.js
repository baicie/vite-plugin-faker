document.getElementById('fetch-btn').addEventListener('click', async () => {
  const resultDiv = document.getElementById('result');
  resultDiv.innerHTML = 'Loading...';
  
  try {
    const response = await fetch('/api/users');
    const data = await response.json();
    
    resultDiv.innerHTML = `
      <h3>Response:</h3>
      <pre>${JSON.stringify(data, null, 2)}</pre>
      <p>Status: ${response.status}</p>
      <p>Source: ${response.headers.get('x-mock-source') || 'Real Server'}</p>
    `;
  } catch (error) {
    resultDiv.innerHTML = `
      <h3 style="color: red">Error:</h3>
      <pre>${error.message}</pre>
    `;
  }
});

console.log('Webpack App Initialized');
