// public/js/register.js

document.getElementById('registerForm').addEventListener('submit', async function(e) {
  e.preventDefault();

  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const user_type = document.getElementById('user_type').value;

  try {
    const response = await fetch('/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }, 
      body: JSON.stringify({ email, password, user_type: user_type })
    });

    const data = await response.json();
    if (data.success) {
      alert(data.message);
    } else {
      alert('Registration failed: ' + data.message);
    }
  } catch (error) {
    console.error('Error:', error);
  }
});  
