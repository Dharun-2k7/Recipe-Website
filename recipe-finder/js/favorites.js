// favorites.js — Favorites logic
import { supabaseClient } from './supabaseClient.js';
import { getUser } from './auth.js';
import { fetchRecipeById, renderRecipes } from './recipes.js';

// ── Check if recipe is favorited ─────────────────────────────
export async function isFavorited(recipeId) {
  const user = await getUser();
  if (!user) return false;
  const { data } = await supabaseClient.from('favorites')
    .select('id').eq('user_id', user.id).eq('recipe_id', recipeId).maybeSingle();
  return !!data;
}

// ── Toggle favorite (add/remove) ─────────────────────────────
export async function toggleFavorite(recipeId) {
  const user = await getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: existing } = await supabaseClient.from('favorites')
    .select('id').eq('user_id', user.id).eq('recipe_id', recipeId).maybeSingle();

  if (existing) {
    await supabaseClient.from('favorites').delete().eq('id', existing.id);
    return false; // removed
  } else {
    await supabaseClient.from('favorites').insert([{ user_id: user.id, recipe_id: recipeId }]);
    return true; // added
  }
}

// ── Fetch all favorited recipes for current user ─────────────
export async function fetchFavoriteRecipes() {
  const user = await getUser();
  if (!user) return [];

  const { data: favs, error } = await supabaseClient.from('favorites')
    .select('recipe_id').eq('user_id', user.id);
  if (error) throw error;
  if (!favs || favs.length === 0) return [];

  const ids = favs.map(f => f.recipe_id);
  const { data: recipes, error: err2 } = await supabaseClient.from('recipes')
    .select('*').in('id', ids);
  if (err2) throw err2;
  return recipes || [];
}

// ── Init favorites page ──────────────────────────────────────
export async function initFavoritesPage() {
  const user = await getUser();
  const content = document.getElementById('favorites-content');
  const gate    = document.getElementById('favorites-gate');

  if (!user) {
    content && (content.style.display = 'none');
    gate    && (gate.style.display    = 'block');
    return;
  }

  gate    && (gate.style.display    = 'none');
  content && (content.style.display = 'block');

  const loading = document.getElementById('loading');
  if (loading) loading.style.display = 'flex';

  try {
    const recipes = await fetchFavoriteRecipes();
    const countEl = document.getElementById('fav-count');
    if (countEl) countEl.textContent = `${recipes.length} saved recipe${recipes.length !== 1 ? 's' : ''}`;
    await renderRecipes(recipes, 'favorites-grid');
  } catch (err) {
    if (content) content.innerHTML = `<div class="error-state">Error: ${err.message}</div>`;
  } finally {
    if (loading) loading.style.display = 'none';
  }
}
