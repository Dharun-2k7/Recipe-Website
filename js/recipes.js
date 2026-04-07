// recipes.js — Recipe fetching, display, search, filter, add
import { supabaseClient } from './supabaseClient.js';
import { getUser } from './auth.js';
import { isFavorited, toggleFavorite } from './favorites.js';

// ── Fetch recipes with optional filters ─────────────────────
export async function fetchRecipes({ search = '', category = '', cuisine = '', minRating = 0 } = {}) {
  let query = supabaseClient.from('recipes').select('*').order('created_at', { ascending: false });
  if (search)    query = query.ilike('title', `%${search}%`);
  if (category)  query = query.eq('category', category);
  if (cuisine)   query = query.eq('cuisine', cuisine);
  if (minRating) query = query.gte('rating_avg', parseFloat(minRating));
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

// ── Fetch single recipe by id ────────────────────────────────
export async function fetchRecipeById(id) {
  const { data, error } = await supabaseClient.from('recipes').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

// ── Render star rating ───────────────────────────────────────
export function renderStars(rating) {
  const full  = Math.floor(rating);
  const half  = rating - full >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(empty);
}

// ── Difficulty badge color ───────────────────────────────────
function diffBadge(diff) {
  const map = { Easy: 'badge-easy', Medium: 'badge-medium', Hard: 'badge-hard' };
  return map[diff] || 'badge-easy';
}

// ── Build recipe card HTML ───────────────────────────────────
export async function buildCard(recipe) {
  const user       = await getUser();
  const favd       = user ? await isFavorited(recipe.id) : false;
  const img        = recipe.image_url || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=80';
  const stars      = renderStars(recipe.rating_avg || 0);
  const ratingText = recipe.rating_count ? `${(recipe.rating_avg || 0).toFixed(1)} (${recipe.rating_count})` : 'No ratings';

  return `
    <div class="recipe-card" data-id="${recipe.id}">
      <div class="card-img-wrap">
        <img src="${img}" alt="${recipe.title}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=80'">
        <span class="card-category">${recipe.category || ''}</span>
        ${user ? `<button class="fav-btn ${favd ? 'fav-active' : ''}" data-id="${recipe.id}" title="Favorite">
          ${favd ? '♥' : '♡'}
        </button>` : ''}
      </div>
      <div class="card-body">
        <div class="card-meta">
          <span class="badge ${diffBadge(recipe.difficulty)}">${recipe.difficulty || 'Easy'}</span>
          <span class="card-time">⏱ ${recipe.cooking_time || '?'} min</span>
        </div>
        <h3 class="card-title">${recipe.title}</h3>
        <p class="card-desc">${(recipe.description || '').substring(0, 90)}${recipe.description?.length > 90 ? '…' : ''}</p>
        <div class="card-footer">
          <span class="card-stars">${stars}</span>
          <span class="card-rating-text">${ratingText}</span>
          <span class="card-cuisine">${recipe.cuisine || ''}</span>
        </div>
      </div>
    </div>`;
}

// ── Render recipe grid ───────────────────────────────────────
export async function renderRecipes(recipes, containerId = 'recipes-grid') {
  const grid = document.getElementById(containerId);
  if (!grid) return;

  if (!recipes || recipes.length === 0) {
    grid.innerHTML = `<div class="empty-state">
      <div class="empty-icon">🍽️</div>
      <h3>No recipes found</h3>
      <p>Try adjusting your search or filters</p>
    </div>`;
    return;
  }

  const cards = await Promise.all(recipes.map(buildCard));
  grid.innerHTML = cards.join('');

  // Click → recipe detail
  grid.querySelectorAll('.recipe-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.fav-btn')) return;
      window.location.href = `recipe.html?id=${card.dataset.id}`;
    });
  });

  // Favorite toggle buttons
  grid.querySelectorAll('.fav-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const user = await getUser();
      if (!user) { window.location.href = 'auth.html'; return; }
      const id   = btn.dataset.id;
      const now  = await toggleFavorite(id);
      btn.textContent  = now ? '♥' : '♡';
      btn.className    = `fav-btn ${now ? 'fav-active' : ''}`;
    });
  });
}

// ── Init home page ───────────────────────────────────────────
export async function initHomePage() {
  const grid        = document.getElementById('recipes-grid');
  const searchInput = document.getElementById('search-input');
  const catFilter   = document.getElementById('filter-category');
  const cuisFilter  = document.getElementById('filter-cuisine');
  const ratingFilter= document.getElementById('filter-rating');
  const loadingEl   = document.getElementById('loading');
  const countEl     = document.getElementById('recipe-count');

  async function load() {
    if (loadingEl) loadingEl.style.display = 'flex';
    if (grid) grid.innerHTML = '';
    try {
      const recipes = await fetchRecipes({
        search:    searchInput?.value || '',
        category:  catFilter?.value   || '',
        cuisine:   cuisFilter?.value  || '',
        minRating: ratingFilter?.value || 0
      });
      if (countEl) countEl.textContent = `${recipes.length} recipe${recipes.length !== 1 ? 's' : ''}`;
      await renderRecipes(recipes);
    } catch (err) {
      if (grid) grid.innerHTML = `<div class="error-state">Failed to load recipes: ${err.message}</div>`;
    } finally {
      if (loadingEl) loadingEl.style.display = 'none';
    }
  }

  let debounceTimer;
  searchInput && searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(load, 350);
  });
  catFilter   && catFilter.addEventListener('change',   load);
  cuisFilter  && cuisFilter.addEventListener('change',  load);
  ratingFilter && ratingFilter.addEventListener('change', load);

  document.getElementById('clear-filters') && document.getElementById('clear-filters').addEventListener('click', () => {
    if (searchInput)   searchInput.value   = '';
    if (catFilter)     catFilter.value     = '';
    if (cuisFilter)    cuisFilter.value    = '';
    if (ratingFilter)  ratingFilter.value  = '';
    load();
  });

  await load();
}

// ── Init recipe detail page ──────────────────────────────────
export async function initRecipePage() {
  const params = new URLSearchParams(window.location.search);
  const id     = params.get('id');
  if (!id) { window.location.href = 'index.html'; return; }

  try {
    const recipe = await fetchRecipeById(id);
    const user   = await getUser();
    const favd   = user ? await isFavorited(recipe.id) : false;
    const img    = recipe.image_url || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80';

    document.title = `${recipe.title} — RecipeFinder`;

    // Hero
    const heroImg   = document.getElementById('recipe-hero-img');
    const heroTitle = document.getElementById('recipe-title');
    const heroCat   = document.getElementById('recipe-category');
    const heroCuisine = document.getElementById('recipe-cuisine');
    const heroTime  = document.getElementById('recipe-time');
    const heroDiff  = document.getElementById('recipe-difficulty');
    const heroRating = document.getElementById('recipe-rating');
    const heroDesc  = document.getElementById('recipe-description');
    const favBtn    = document.getElementById('detail-fav-btn');

    if (heroImg)    heroImg.src = img;
    if (heroTitle)  heroTitle.textContent   = recipe.title;
    if (heroCat)    heroCat.textContent     = recipe.category || '';
    if (heroCuisine) heroCuisine.textContent = recipe.cuisine || '';
    if (heroTime)   heroTime.textContent    = `${recipe.cooking_time || '?'} min`;
    if (heroDiff)   heroDiff.textContent    = recipe.difficulty || 'Easy';
    if (heroRating) heroRating.innerHTML    = `${renderStars(recipe.rating_avg || 0)} <span>${recipe.rating_count ? `${(recipe.rating_avg||0).toFixed(1)} / 5` : 'No ratings'}</span>`;
    if (heroDesc)   heroDesc.textContent    = recipe.description || '';

    // Fav button
    if (favBtn) {
      favBtn.innerHTML  = favd ? '♥ Saved' : '♡ Save';
      favBtn.className  = `btn-fav ${favd ? 'fav-active' : ''}`;
      favBtn.addEventListener('click', async () => {
        if (!user) { window.location.href = 'auth.html'; return; }
        const now      = await toggleFavorite(recipe.id);
        favBtn.innerHTML  = now ? '♥ Saved' : '♡ Save';
        favBtn.className  = `btn-fav ${now ? 'fav-active' : ''}`;
      });
    }

    // Ingredients
    const ingList = document.getElementById('ingredients-list');
    if (ingList && recipe.ingredients) {
      ingList.innerHTML = (recipe.ingredients || []).map(i => `<li>${i}</li>`).join('');
    }

    // Steps
    const stepsList = document.getElementById('steps-list');
    if (stepsList && recipe.steps) {
      stepsList.innerHTML = (recipe.steps || []).map((s, i) => `
        <li class="step-item">
          <span class="step-num">${i + 1}</span>
          <span class="step-text">${s}</span>
        </li>`).join('');
    }

  } catch (err) {
    document.getElementById('recipe-content') && (document.getElementById('recipe-content').innerHTML = `<div class="error-state">Recipe not found: ${err.message}</div>`);
  }
}

// ── Add Recipe page ──────────────────────────────────────────
export async function initAddRecipePage() {
  const user = await getUser();
  if (!user) { window.location.href = 'auth.html'; return; }

  const form = document.getElementById('add-recipe-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type=submit]');
    const msg = document.getElementById('form-msg');
    btn.disabled = true; btn.textContent = 'Saving…';

    try {
      // Image upload
      let imageUrl = '';
      const fileInput = form.querySelector('[name=image]');
      if (fileInput && fileInput.files[0]) {
        const file = fileInput.files[0];
        const ext  = file.name.split('.').pop();
        const path = `recipes/${Date.now()}.${ext}`;
        const { error: upErr } = await supabaseClient.storage.from('recipe-images').upload(path, file, { upsert: true });
        if (upErr) throw upErr;
        const { data: urlData } = supabaseClient.storage.from('recipe-images').getPublicUrl(path);
        imageUrl = urlData.publicUrl;
      }

      // Parse ingredients & steps
      const rawIngredients = form.querySelector('[name=ingredients]').value;
      const rawSteps       = form.querySelector('[name=steps]').value;
      const ingredients    = rawIngredients.split('\n').map(s => s.trim()).filter(Boolean);
      const steps          = rawSteps.split('\n').map(s => s.trim()).filter(Boolean);

      const payload = {
        title:        form.querySelector('[name=title]').value.trim(),
        description:  form.querySelector('[name=description]').value.trim(),
        category:     form.querySelector('[name=category]').value,
        cuisine:      form.querySelector('[name=cuisine]').value.trim(),
        cooking_time: parseInt(form.querySelector('[name=cooking_time]').value) || 30,
        difficulty:   form.querySelector('[name=difficulty]').value,
        ingredients,
        steps,
        image_url:    imageUrl,
        author_id:    user.id,
        rating_avg:   0,
        rating_count: 0
      };

      const { data, error } = await supabaseClient.from('recipes').insert([payload]).select().single();
      if (error) throw error;

      msg.textContent = '✓ Recipe added successfully!';
      msg.className   = 'form-message success';
      setTimeout(() => window.location.href = `recipe.html?id=${data.id}`, 1200);
    } catch (err) {
      msg.textContent = `Error: ${err.message}`;
      msg.className   = 'form-message error';
      btn.disabled    = false; btn.textContent = 'Publish Recipe';
    }
  });
}
