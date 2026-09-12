document.querySelector('#login').addEventListener('submit', async event => {
  event.preventDefault(); const button = event.target.querySelector('button'); button.disabled = true;
  try {
    const token = document.querySelector('#code').value.trim();
    const response = await fetch('/classroom/me', {headers: {Authorization: `Bearer ${token}`}});
    if (!response.ok) throw Error('That access code is invalid or expired. Ask your course administrator for a new code.');
    const user = await response.json(); sessionStorage.setItem('verity-session', token);
    location.assign(user.role === 'student' ? '/student/' : '/teacher/');
  } catch (e) { document.querySelector('#error').textContent = e.message; }
  finally { button.disabled = false; }
});
