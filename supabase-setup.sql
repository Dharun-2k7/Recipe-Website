-- ============================================================
-- RecipeFinder — Supabase SQL Setup
-- Run this in: Supabase Dashboard > SQL Editor > New Query
-- ============================================================


-- ── 1. EXTENSIONS ───────────────────────────────────────────
create extension if not exists "uuid-ossp";


-- ── 2. TABLES ───────────────────────────────────────────────

-- Recipes
create table if not exists recipes (
  id            uuid primary key default uuid_generate_v4(),
  title         text not null,
  description   text,
  ingredients   text[],
  steps         text[],
  image_url     text,
  category      text,
  cuisine       text,
  cooking_time  int,
  difficulty    text check (difficulty in ('Easy', 'Medium', 'Hard')),
  author_id     uuid references auth.users(id) on delete set null,
  rating_avg    float default 0,
  rating_count  int default 0,
  created_at    timestamptz default now()
);

-- Reviews
create table if not exists reviews (
  id          uuid primary key default uuid_generate_v4(),
  recipe_id   uuid references recipes(id) on delete cascade,
  user_id     uuid references auth.users(id) on delete cascade,
  user_email  text,
  rating      int check (rating between 1 and 5),
  comment     text,
  created_at  timestamptz default now(),
  unique(recipe_id, user_id)
);

-- Favorites
create table if not exists favorites (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references auth.users(id) on delete cascade,
  recipe_id   uuid references recipes(id) on delete cascade,
  created_at  timestamptz default now(),
  unique(user_id, recipe_id)
);


-- ── 3. ROW LEVEL SECURITY ────────────────────────────────────

-- Recipes: anyone can read, authenticated users can insert/update their own
alter table recipes enable row level security;

create policy "recipes_read_all"   on recipes for select using (true);
create policy "recipes_insert_own" on recipes for insert with check (auth.uid() = author_id);
create policy "recipes_update_own" on recipes for update using (auth.uid() = author_id);
create policy "recipes_delete_own" on recipes for delete using (auth.uid() = author_id);

-- Allow updating rating_avg and rating_count by anyone (for review trigger)
-- (We handle this in app logic with service role; for simplicity allow update for authenticated)
create policy "recipes_update_rating" on recipes for update using (auth.uid() is not null);

-- Reviews
alter table reviews enable row level security;

create policy "reviews_read_all"      on reviews for select using (true);
create policy "reviews_insert_auth"   on reviews for insert with check (auth.uid() = user_id);
create policy "reviews_update_own"    on reviews for update using (auth.uid() = user_id);
create policy "reviews_delete_own"    on reviews for delete using (auth.uid() = user_id);

-- Favorites
alter table favorites enable row level security;

create policy "favorites_read_own"   on favorites for select using (auth.uid() = user_id);
create policy "favorites_insert_own" on favorites for insert with check (auth.uid() = user_id);
create policy "favorites_delete_own" on favorites for delete using (auth.uid() = user_id);


-- ── 4. STORAGE BUCKET ────────────────────────────────────────
-- Run separately in Supabase Dashboard > Storage > New Bucket
-- Bucket name: recipe-images
-- Public: true

insert into storage.buckets (id, name, public)
values ('recipe-images', 'recipe-images', true)
on conflict (id) do nothing;

create policy "recipe_images_read_all"
  on storage.objects for select
  using (bucket_id = 'recipe-images');

create policy "recipe_images_insert_auth"
  on storage.objects for insert
  with check (bucket_id = 'recipe-images' and auth.uid() is not null);

create policy "recipe_images_delete_own"
  on storage.objects for delete
  using (bucket_id = 'recipe-images' and auth.uid() is not null);


-- ── 5. SAMPLE DATA ───────────────────────────────────────────
-- 6 diverse recipes (Indian + global) for demo purposes
-- No author_id set so they appear as system/demo recipes

insert into recipes (title, description, ingredients, steps, image_url, category, cuisine, cooking_time, difficulty, rating_avg, rating_count)
values

-- 1. Butter Chicken
(
  'Creamy Butter Chicken',
  'A rich, aromatic North Indian classic — tender chicken simmered in a velvety tomato-butter sauce with warming spices. Pairs beautifully with naan or basmati rice.',
  array[
    '800g chicken thighs, cut into chunks',
    '1 cup thick yogurt',
    '2 tsp garam masala',
    '2 tsp cumin powder',
    '1 tsp turmeric',
    '4 tbsp butter',
    '2 onions, finely chopped',
    '5 garlic cloves, minced',
    '1 tbsp fresh ginger, grated',
    '400g crushed tomatoes',
    '200ml heavy cream',
    '1 tsp sugar',
    'Salt to taste',
    'Fresh coriander for garnish'
  ],
  array[
    'Marinate chicken in yogurt, garam masala, 1 tsp cumin, turmeric, and salt. Refrigerate for at least 1 hour (overnight is best).',
    'Grill or pan-fry the marinated chicken until lightly charred. Set aside.',
    'In a large pan, melt butter over medium heat. Add onions and cook until golden, about 10 minutes.',
    'Add garlic and ginger, cook for 2 minutes until fragrant.',
    'Pour in crushed tomatoes, remaining cumin, and a pinch of salt. Simmer 15 minutes until thick.',
    'Blend the sauce smooth, then return to pan. Add cream and sugar.',
    'Add the grilled chicken to the sauce. Simmer 10 minutes.',
    'Garnish with coriander and a swirl of cream. Serve with naan or basmati rice.'
  ],
  'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=600&q=80',
  'Dinner', 'Indian', 60, 'Medium', 4.8, 24
),

-- 2. Spaghetti Carbonara
(
  'Authentic Spaghetti Carbonara',
  'The real Roman recipe — no cream, just eggs, Pecorino, and guanciale creating the silkiest, most indulgent pasta sauce you will ever taste.',
  array[
    '400g spaghetti',
    '200g guanciale (or pancetta)',
    '4 large egg yolks + 1 whole egg',
    '100g Pecorino Romano, finely grated',
    '50g Parmesan, grated',
    'Freshly ground black pepper (generous)',
    'Salt for pasta water'
  ],
  array[
    'Cook spaghetti in heavily salted boiling water until al dente. Reserve 200ml pasta water before draining.',
    'Meanwhile, cook guanciale in a wide pan over medium heat until crispy and golden. Remove from heat.',
    'Whisk egg yolks and whole egg with grated cheeses and plenty of black pepper in a bowl.',
    'Add hot pasta to the guanciale pan (off heat). Toss to coat in the fat.',
    'Slowly add egg mixture, tossing constantly. Add splashes of reserved pasta water to create a creamy, flowing sauce.',
    'Plate immediately with extra Pecorino and a blizzard of black pepper.'
  ],
  'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=600&q=80',
  'Dinner', 'Italian', 25, 'Medium', 4.9, 31
),

-- 3. Masala Dosa
(
  'Crispy Masala Dosa',
  'South India''s most iconic breakfast — a wafer-thin, perfectly crisped rice crepe filled with a spiced potato masala. Served with coconut chutney and sambar.',
  array[
    '2 cups idli rice',
    '1 cup urad dal',
    '1 tsp fenugreek seeds',
    'Salt to taste',
    '3 large potatoes, boiled and mashed',
    '2 onions, sliced',
    '2 green chillies, chopped',
    '1 tsp mustard seeds',
    '10 curry leaves',
    '1 tsp turmeric',
    '2 tbsp oil',
    'Fresh coriander'
  ],
  array[
    'Soak rice and urad dal with fenugreek seeds separately for 6 hours. Grind into a smooth batter. Ferment overnight.',
    'For masala: heat oil, add mustard seeds. When they pop, add curry leaves, chillies, onions.',
    'Cook onions until soft. Add turmeric and mashed potatoes. Season with salt. Mix well.',
    'Heat a cast-iron pan. Ladle batter and spread in a thin circle from the centre outwards.',
    'Drizzle oil around the edges. Cook until golden and crispy on the underside.',
    'Place a spoonful of potato masala in the centre. Fold the dosa over.',
    'Serve hot with coconut chutney and sambar.'
  ],
  'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=600&q=80',
  'Breakfast', 'Indian', 45, 'Hard', 4.7, 18
),

-- 4. Avocado Toast
(
  'Perfect Avocado Toast',
  'Elevated avocado toast with a poached egg, chilli flakes, and lemon — the breakfast that defined a generation, made properly.',
  array[
    '2 slices sourdough bread',
    '1 large ripe avocado',
    '2 eggs',
    '1 tbsp white wine vinegar',
    'Juice of half a lemon',
    'Red chilli flakes',
    'Sea salt and black pepper',
    'Extra virgin olive oil',
    'Microgreens or fresh herbs to garnish'
  ],
  array[
    'Toast sourdough slices until golden and crisp.',
    'Halve avocado, remove stone, scoop flesh into a bowl. Add lemon juice, salt and pepper. Mash with a fork, keeping it chunky.',
    'Bring a pan of water to a gentle simmer. Add vinegar.',
    'Crack egg into a small cup. Create a gentle whirlpool in the water and slide egg in. Poach 3 minutes for a runny yolk.',
    'Spread mashed avocado generously over toast.',
    'Top with poached egg, chilli flakes, salt, and a drizzle of olive oil.',
    'Garnish with microgreens or herbs. Serve immediately.'
  ],
  'https://images.unsplash.com/photo-1603046891726-36bfd957e0bf?w=600&q=80',
  'Breakfast', 'American', 15, 'Easy', 4.5, 42
),

-- 5. Mango Sticky Rice
(
  'Thai Mango Sticky Rice',
  'Thailand''s beloved dessert — glutinous rice cooked in sweet coconut milk, served with ripe fresh mango and a drizzle of salted coconut cream. Pure tropical bliss.',
  array[
    '2 cups glutinous (sticky) rice',
    '1 can (400ml) coconut milk',
    '4 tbsp sugar',
    '1 tsp salt',
    '2 ripe mangoes, sliced',
    '1 tsp cornstarch (for sauce)',
    'Toasted sesame seeds'
  ],
  array[
    'Soak sticky rice in water for at least 4 hours or overnight. Drain well.',
    'Steam rice in a bamboo steamer or colander over boiling water for 20–25 minutes until tender.',
    'While rice steams, heat 300ml coconut milk with 3 tbsp sugar and 3/4 tsp salt until sugar dissolves. Do not boil.',
    'Transfer cooked rice to a bowl. Pour the warm coconut mixture over rice. Stir, cover and let absorb 20 minutes.',
    'For the sauce: heat remaining coconut milk with 1 tbsp sugar, 1/4 tsp salt, and cornstarch until slightly thickened.',
    'Arrange sticky rice on plates. Add mango slices. Drizzle with coconut sauce. Scatter sesame seeds.'
  ],
  'https://images.unsplash.com/photo-1562523157-f9769e4dde1f?w=600&q=80',
  'Dessert', 'Thai', 50, 'Medium', 4.6, 15
),

-- 6. Classic Beef Tacos
(
  'Street-Style Beef Tacos',
  'Mexican street tacos done right — seasoned ground beef with pickled onions, salsa verde, and fresh toppings on warm corn tortillas. Fiesta in every bite.',
  array[
    '500g ground beef',
    '12 small corn tortillas',
    '1 onion, finely diced',
    '4 garlic cloves, minced',
    '2 tsp cumin',
    '2 tsp chilli powder',
    '1 tsp oregano',
    '1 tsp smoked paprika',
    'Salt and pepper',
    '1/2 cup beef stock',
    'Toppings: diced onion, fresh coriander, lime wedges, salsa, sour cream, jalapeños'
  ],
  array[
    'Heat oil in a skillet over high heat. Add beef and cook, breaking it apart, until browned.',
    'Add garlic, cumin, chilli powder, oregano, paprika, salt and pepper. Stir and cook 1 minute.',
    'Pour in beef stock. Simmer until liquid nearly evaporates and meat is juicy but not dry, about 5 minutes.',
    'Warm tortillas in a dry pan or directly over a gas flame, turning with tongs.',
    'Double up two tortillas per taco (street style). Add a spoonful of beef.',
    'Top with diced onion, fresh coriander, a squeeze of lime, and your choice of salsa and sour cream.',
    'Serve immediately while tortillas are warm.'
  ],
  'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=600&q=80',
  'Dinner', 'Mexican', 30, 'Easy', 4.7, 29
);


-- ── 6. VERIFY ────────────────────────────────────────────────
select id, title, cuisine, category, cooking_time, difficulty from recipes order by created_at;
