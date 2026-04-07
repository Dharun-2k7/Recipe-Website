// auth.js — Authentication logic
import { supabaseClient } from './supabaseClient.js';

// ── Get current session ──────────────────────────────────────
export async function getSession() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  return session;
}

export async function getUser() {
  const session = await getSession();
  return session?.user ?? null;
}

// ── Update nav UI based on auth state ───────────────────────
export async function updateNavAuth() {
  const user = await getUser();
  const loginLink  = document.getElementById('nav-login');
  const logoutBtn  = document.getElementById('nav-logout');
  const addLink    = document.getElementById('nav-add');
  const favsLink   = document.getElementById('nav-favs');
  const userEmail  = document.getElementById('nav-user-email');

  if (user) {
    loginLink  && (loginLink.style.display  = 'none');
    logoutBtn  && (logoutBtn.style.display  = 'inline-flex');
    addLink    && (addLink.style.display    = 'inline-flex');
    favsLink   && (favsLink.style.display   = 'inline-flex');
    userEmail  && (userEmail.textContent    = user.email.split('@')[0]);
    userEmail  && (userEmail.style.display  = 'inline-flex');
  } else {
    loginLink  && (loginLink.style.display  = 'inline-flex');
    logoutBtn  && (logoutBtn.style.display  = 'none');
    addLink    && (addLink.style.display    = 'none');
    favsLink   && (favsLink.style.display   = 'none');
    userEmail  && (userEmail.style.display  = 'none');
  }
}

// ── Sign Up ──────────────────────────────────────────────────
export async function signUp(email, password) {
  const { data, error } = await supabaseClient.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

// ── Sign In ──────────────────────────────────────────────────
export async function signIn(email, password) {
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

// ── Sign Out ─────────────────────────────────────────────────
export async function signOut() {
  const { error } = await supabaseClient.auth.signOut();
  if (error) throw error;
  window.location.href = 'index.html';
}

// ── Forgot Password ──────────────────────────────────────────
export async function resetPassword(email) {
  const { error } = await supabaseClient.auth.resetPasswordForEmail(email);
  if (error) throw error;
}

// ── Verify OTP ───────────────────────────────────────────────
export async function verifyOtp(email, token, type) {
  const { data, error } = await supabaseClient.auth.verifyOtp({ email, token, type });
  if (error) throw error;
  return data;
}

// ── Update Password ──────────────────────────────────────────
export async function updatePassword(newPassword) {
  const { data, error } = await supabaseClient.auth.updateUser({ password: newPassword });
  if (error) throw error;
  return data;
}

// ── Auth page init ───────────────────────────────────────────
export async function initAuthPage() {
  // If already logged in, redirect home
  const user = await getUser();
  if (user) { window.location.href = 'index.html'; return; }

  const params    = new URLSearchParams(window.location.search);
  const mode      = params.get('mode') || 'login';
  const loginTab  = document.getElementById('tab-login');
  const signupTab = document.getElementById('tab-signup');
  const forgotTab = document.getElementById('tab-forgot');
  const loginForm  = document.getElementById('form-login');
  const signupForm = document.getElementById('form-signup');
  const forgotForm = document.getElementById('form-forgot');
  const otpForm    = document.getElementById('form-otp');
  const updatePassForm = document.getElementById('form-update-password');

  // State to track what type of OTP verification we're doing
  let currentOtpEmail = '';
  let currentOtpType  = ''; // 'signup' or 'recovery'

  function showTab(t, showOtp = false, showUpdatePass = false) {
    [loginForm, signupForm, forgotForm, otpForm, updatePassForm].forEach(f => f && (f.style.display = 'none'));
    [loginTab, signupTab, forgotTab].forEach(b => b && b.classList.remove('active'));
    
    if (showOtp && otpForm) {
      otpForm.style.display = 'flex';
      // keep the tab highlighted roughly based on context
      if (t === 'signup') signupTab && signupTab.classList.add('active');
      else if (t === 'forgot') forgotTab && forgotTab.classList.add('active');
      return;
    }

    if (showUpdatePass && updatePassForm) {
      updatePassForm.style.display = 'flex';
      forgotTab && forgotTab.classList.add('active');
      return;
    }

    if (t === 'login')  { loginForm  && (loginForm.style.display  = 'flex'); loginTab  && loginTab.classList.add('active'); }
    if (t === 'signup') { signupForm && (signupForm.style.display = 'flex'); signupTab && signupTab.classList.add('active'); }
    if (t === 'forgot') { forgotForm && (forgotForm.style.display = 'flex'); forgotTab && forgotTab.classList.add('active'); }
  }

  showTab(mode);
  loginTab  && loginTab.addEventListener('click',  () => showTab('login'));
  signupTab && signupTab.addEventListener('click', () => showTab('signup'));
  forgotTab && forgotTab.addEventListener('click', () => showTab('forgot'));

  // Login form submit
  loginForm && loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email    = loginForm.querySelector('[name=email]').value.trim();
    const password = loginForm.querySelector('[name=password]').value;
    const btn      = loginForm.querySelector('button[type=submit]');
    const msg      = loginForm.querySelector('.form-message');
    btn.disabled   = true; btn.textContent = 'Signing in…';
    try {
      await signIn(email, password);
      window.location.href = 'index.html';
    } catch (err) {
      msg.textContent = err.message; msg.className = 'form-message error';
      btn.disabled = false; btn.textContent = 'Sign In';
    }
  });

  // Signup form submit
  signupForm && signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email    = signupForm.querySelector('[name=email]').value.trim();
    const password = signupForm.querySelector('[name=password]').value;
    const confirm  = signupForm.querySelector('[name=confirm]').value;
    const btn      = signupForm.querySelector('button[type=submit]');
    const msg      = signupForm.querySelector('.form-message');
    if (password !== confirm) { msg.textContent = 'Passwords do not match.'; msg.className = 'form-message error'; return; }
    btn.disabled = true; btn.textContent = 'Creating account…';
    try {
      await signUp(email, password);
      // Success - show OTP form instead of asking them to click a link
      currentOtpEmail = email;
      currentOtpType = 'signup';
      showTab('signup', true); // Show OTP form under signup tab context
      otpForm.querySelector('.form-message').textContent = 'Account created! Enter the code sent to ' + email;
      otpForm.querySelector('.form-message').className = 'form-message success';
      btn.disabled = false; btn.textContent = 'Create Account';
    } catch (err) {
      msg.textContent = err.message; msg.className = 'form-message error';
      btn.disabled = false; btn.textContent = 'Create Account';
    }
  });

  // Forgot password form
  forgotForm && forgotForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = forgotForm.querySelector('[name=email]').value.trim();
    const btn   = forgotForm.querySelector('button[type=submit]');
    const msg   = forgotForm.querySelector('.form-message');
    btn.disabled = true; btn.textContent = 'Sending…';
    try {
      await resetPassword(email);
      currentOtpEmail = email;
      currentOtpType = 'recovery';
      showTab('forgot', true); // Show OTP form under forgot tab context
      otpForm.querySelector('.form-message').textContent = 'Reset code sent! Enter the code sent to ' + email;
      otpForm.querySelector('.form-message').className = 'form-message success';
      btn.disabled = false; btn.textContent = 'Send Reset Code';
    } catch (err) {
      msg.textContent = err.message; msg.className = 'form-message error';
      btn.disabled = false; btn.textContent = 'Send Reset Code';
    }
  });

  // OTP Verification form submit
  otpForm && otpForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const token = otpForm.querySelector('[name=token]').value.trim();
    const btn   = otpForm.querySelector('button[type=submit]');
    const msg   = otpForm.querySelector('.form-message');
    btn.disabled = true; btn.textContent = 'Verifying…';
    try {
      await verifyOtp(currentOtpEmail, token, currentOtpType);
      msg.className = 'form-message success';
      btn.disabled = false; btn.textContent = 'Verify Code';
      
      if (currentOtpType === 'signup') {
        // Logged in automatically upon successful signup OTP
        window.location.href = 'index.html';
      } else if (currentOtpType === 'recovery') {
        // Show update password form
        showTab('forgot', false, true); 
      }
    } catch (err) {
      msg.textContent = err.message; msg.className = 'form-message error';
      btn.disabled = false; btn.textContent = 'Verify Code';
    }
  });

  // Update Password form submit (After successful recovery OTP)
  updatePassForm && updatePassForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = updatePassForm.querySelector('[name=password]').value;
    const confirm  = updatePassForm.querySelector('[name=confirm]').value;
    const btn      = updatePassForm.querySelector('button[type=submit]');
    const msg      = updatePassForm.querySelector('.form-message');

    if (password !== confirm) { msg.textContent = 'Passwords do not match.'; msg.className = 'form-message error'; return; }
    
    btn.disabled = true; btn.textContent = 'Updating…';
    try {
      await updatePassword(password);
      msg.textContent = '✓ Password updated successfully!';
      msg.className = 'form-message success';
      btn.disabled = false; btn.textContent = 'Update Password';
      
      // Short delay before going home
      setTimeout(() => { window.location.href = 'index.html'; }, 1500);
    } catch (err) {
      msg.textContent = err.message; msg.className = 'form-message error';
      btn.disabled = false; btn.textContent = 'Update Password';
    }
  });
}
