// reviews.js — Reviews: fetch, display, add
import { supabaseClient } from './supabaseClient.js';
import { getUser } from './auth.js';

// ── Fetch reviews for a recipe ───────────────────────────────
export async function fetchReviews(recipeId) {
  const { data, error } = await supabaseClient
    .from('reviews')
    .select('*')
    .eq('recipe_id', recipeId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

// ── Render reviews list ──────────────────────────────────────
export function renderReviews(reviews, containerId = 'reviews-list') {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (!reviews || reviews.length === 0) {
    el.innerHTML = '<p class="no-reviews">No reviews yet. Be the first to review!</p>';
    return;
  }
  el.innerHTML = reviews.map(r => {
    const stars = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
    const date  = new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const initials = r.user_email ? r.user_email.substring(0,2).toUpperCase() : 'AN';
    return `
      <div class="review-card">
        <div class="review-header">
          <div class="review-avatar">${initials}</div>
          <div class="review-meta">
            <span class="review-author">${r.user_email || 'Anonymous'}</span>
            <span class="review-date">${date}</span>
          </div>
          <span class="review-stars">${stars}</span>
        </div>
        ${r.comment ? `<p class="review-comment">${r.comment}</p>` : ''}
      </div>`;
  }).join('');
}

// ── Init reviews section on recipe detail page ───────────────
export async function initReviews(recipeId) {
  const user = await getUser();
  const reviewsSection = document.getElementById('reviews-section');
  if (!reviewsSection) return;

  // Load & render existing reviews
  async function loadReviews() {
    try {
      const reviews = await fetchReviews(recipeId);
      renderReviews(reviews);
      const countEl = document.getElementById('reviews-count');
      if (countEl) countEl.textContent = `${reviews.length} Review${reviews.length !== 1 ? 's' : ''}`;
    } catch (err) {
      console.error('Failed to load reviews', err);
    }
  }

  await loadReviews();

  // Review form
  const reviewForm = document.getElementById('review-form');
  const reviewGate = document.getElementById('review-gate');

  if (!user) {
    reviewForm && (reviewForm.style.display = 'none');
    reviewGate && (reviewGate.style.display = 'block');
    return;
  }

  reviewGate && (reviewGate.style.display = 'none');
  reviewForm && (reviewForm.style.display = 'block');

  // Star rating picker
  const starPicker = reviewForm?.querySelector('.star-picker');
  let selectedRating = 0;
  if (starPicker) {
    const stars = starPicker.querySelectorAll('.star-pick');
    stars.forEach((s, i) => {
      s.addEventListener('mouseover', () => {
        stars.forEach((x, j) => x.classList.toggle('hover', j <= i));
      });
      s.addEventListener('mouseleave', () => {
        stars.forEach(x => x.classList.remove('hover'));
      });
      s.addEventListener('click', () => {
        selectedRating = i + 1;
        stars.forEach((x, j) => x.classList.toggle('selected', j <= i));
        starPicker.dataset.rating = selectedRating;
      });
    });
  }

  reviewForm && reviewForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn     = reviewForm.querySelector('button[type=submit]');
    const comment = reviewForm.querySelector('[name=comment]').value.trim();
    const msg     = reviewForm.querySelector('.form-message');

    if (!selectedRating) {
      msg.textContent = 'Please select a star rating.'; msg.className = 'form-message error'; return;
    }

    btn.disabled = true; btn.textContent = 'Submitting…';

    try {
      // Check if already reviewed
      const { data: existing } = await supabaseClient.from('reviews')
        .select('id').eq('recipe_id', recipeId).eq('user_id', user.id).maybeSingle();

      if (existing) {
        // Update
        const { error } = await supabaseClient.from('reviews')
          .update({ rating: selectedRating, comment, user_email: user.email })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        // Insert
        const { error } = await supabaseClient.from('reviews').insert([{
          recipe_id:  recipeId,
          user_id:    user.id,
          user_email: user.email,
          rating:     selectedRating,
          comment
        }]);
        if (error) throw error;
      }

      // Recalculate rating_avg and rating_count
      const { data: allReviews } = await supabaseClient.from('reviews')
        .select('rating').eq('recipe_id', recipeId);
      if (allReviews) {
        const count = allReviews.length;
        const avg   = allReviews.reduce((s, r) => s + r.rating, 0) / count;
        await supabaseClient.from('recipes')
          .update({ rating_avg: Math.round(avg * 10) / 10, rating_count: count })
          .eq('id', recipeId);
      }

      msg.textContent = '✓ Review submitted!'; msg.className = 'form-message success';
      reviewForm.querySelector('[name=comment]').value = '';
      selectedRating = 0;
      starPicker?.querySelectorAll('.star-pick').forEach(s => s.classList.remove('selected'));
      await loadReviews();
      btn.disabled    = false; btn.textContent = 'Submit Review';
    } catch (err) {
      msg.textContent = `Error: ${err.message}`; msg.className = 'form-message error';
      btn.disabled    = false; btn.textContent = 'Submit Review';
    }
  });
}
