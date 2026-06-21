import 'dotenv/config';

const BASE = 'http://localhost:5000/api';
const email = `recipes-test-${Date.now()}@example.com`;

let passed = 0;
let failed = 0;

function assert(condition, label, detail = '') {
  if (condition) {
    passed += 1;
    console.log(`✓ ${label}`);
  } else {
    failed += 1;
    console.error(`✗ ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

async function request(method, path, { token, body, expectStatus } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (expectStatus !== undefined && res.status !== expectStatus) {
    throw new Error(`${method} ${path} expected ${expectStatus}, got ${res.status}: ${text}`);
  }

  return { status: res.status, data };
}

const sampleRecipe = {
  title: 'Chocolate Cake',
  description: 'Rich and moist',
  ingredients: ['2 cups flour', '1 cup sugar'],
  instructions: [
    { text: 'Preheat oven to 180°C', timer: { duration: 0, hasTimer: false } },
    { text: 'Bake until done', timer: { duration: 1800, hasTimer: true } },
  ],
  categories: [],
  prepTime: { hours: 0, minutes: 45 },
  servings: '8',
  notes: 'Best served warm',
  isFavorite: false,
};

async function run() {
  console.log('--- Recipes API manual test ---\n');

  const health = await request('GET', '/health', { expectStatus: 200 });
  assert(health.data?.success === true, 'GET /api/health');

  const auth = await request('POST', '/auth/register', {
    body: { name: 'Recipes Tester', email, password: 'password123' },
    expectStatus: 201,
  });
  const token = auth.data.token;
  assert(Boolean(token), 'POST /auth/register returns token');

  const noAuth = await request('GET', '/recipes', { expectStatus: 401 });
  assert(noAuth.data?.success === false, 'GET /recipes without JWT returns 401');

  const created = await request('POST', '/recipes', {
    token,
    body: sampleRecipe,
    expectStatus: 201,
  });
  const recipeId = created.data._id;
  assert(created.data.title === sampleRecipe.title, 'POST /recipes creates recipe');
  assert(created.data.userId, 'POST /recipes sets userId');

  const list = await request('GET', '/recipes', { token, expectStatus: 200 });
  assert(Array.isArray(list.data.items), 'GET /recipes returns paginated items');
  assert(list.data.total >= 1, 'GET /recipes total >= 1');
  assert(list.data.page === 1, 'GET /recipes default page is 1');
  assert(list.data.limit === 20, 'GET /recipes default limit is 20');

  const byId = await request('GET', `/recipes/${recipeId}`, { token, expectStatus: 200 });
  assert(byId.data._id === recipeId, 'GET /recipes/:id returns recipe');

  const patched = await request('PATCH', `/recipes/${recipeId}`, {
    token,
    body: { isFavorite: true, title: 'Updated Cake' },
    expectStatus: 200,
  });
  assert(patched.data.isFavorite === true, 'PATCH /recipes/:id updates fields');
  assert(patched.data.title === 'Updated Cake', 'PATCH /recipes/:id updates title');

  const replaced = await request('PUT', `/recipes/${recipeId}`, {
    token,
    body: { ...sampleRecipe, title: 'Replaced Cake', isFavorite: true },
    expectStatus: 200,
  });
  assert(replaced.data.title === 'Replaced Cake', 'PUT /recipes/:id full replace');

  const invalidId = await request('GET', '/recipes/not-an-id', { token, expectStatus: 400 });
  assert(invalidId.data?.success === false, 'GET /recipes/:id invalid id returns 400');

  const emptyPatch = await request('PATCH', `/recipes/${recipeId}`, {
    token,
    body: {},
    expectStatus: 400,
  });
  assert(emptyPatch.data?.success === false, 'PATCH /recipes/:id empty body returns 400');

  const deleted = await request('DELETE', `/recipes/${recipeId}`, { token, expectStatus: 204 });
  assert(deleted.status === 204, 'DELETE /recipes/:id returns 204');

  const notFound = await request('GET', `/recipes/${recipeId}`, { token, expectStatus: 404 });
  assert(notFound.data?.success === false, 'GET /recipes/:id after delete returns 404');

  console.log(`\n--- Results: ${passed} passed, ${failed} failed ---`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error('Test run failed:', err.message);
  process.exit(1);
});
