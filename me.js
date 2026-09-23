async function decodeSecretMessage(url) {
  const html = await (await fetch(url)).text();

  // Parse all table rows and clean text inside cells
  const rows = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map(row =>
    [...row[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(cell =>
      cell[1].replace(/<[^>]+>/g, '').trim()
    )
  );

  // Extract coordinates and characters, ignoring non-numeric header rows
  const points = rows
    .map(r => ({ x: parseInt(r[0]), char: r[1], y: parseInt(r[2]) }))
    .filter(p => !isNaN(p.x) && !isNaN(p.y) && p.char);

  if (points.length === 0) return;

  // Determine grid size
  const maxX = Math.max(...points.map(p => p.x));
  const maxY = Math.max(...points.map(p => p.y));

  // Create grid, place characters, and print
  const grid = Array.from({ length: maxY + 1 }, () => Array(maxX + 1).fill(' '));
  points.forEach(({ x, y, char }) => (grid[maxY - y][x] = char));

  grid.forEach(row => console.log(row.join('')));
}

// Execute function with the test document
decodeSecretMessage('https://docs.google.com/document/d/e/2PACX-1vSvM5gDlNvt7npYHhp_XfsJvuntUhq184By5xO_pA4b_gCWeXb6dM6ZxwN8rE6S4ghUsCj2VKR21oEP/pub');