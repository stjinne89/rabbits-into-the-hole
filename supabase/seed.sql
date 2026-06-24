-- Seed reference data. Safe to re-run (idempotent on natural keys).

insert into public.rabbit_breeds (name, description, image_url, marker_color) values
  (
    'REX',
    'De muzieksnob: kent elke B-kant en staat vooraan vóór de doorbraak.',
    '/breeds/rex.svg',
    '#a3a3a3'
  ),
  (
    'Fuzzy Lop',
    'De vrolijke dwaalgast: volgt de groep en belandt altijd bij het beste feestje.',
    '/breeds/fuzzy-lop.svg',
    '#eab308'
  ),
  (
    'Teddy Widder',
    'De knuffelraver: glitter op de wangen, armen in de lucht en vrienden overal.',
    '/breeds/teddy-widder.svg',
    '#f59e0b'
  ),
  (
    'Witte van Hotot',
    'De scherpe spotter: witte outfit, zwarte eyeliner en altijd als eerste bij de verborgen parel.',
    '/breeds/witte-van-hotot.svg',
    '#374151'
  ),
  (
    'Vlaamse Reus',
    'Het rustpunt van de groep: bewaakt de plek en heeft altijd ruimte op het kleed.',
    '/breeds/vlaamse-reus.svg',
    '#6b7280'
  ),
  (
    'Dwergkonijn',
    'De energiebom: weinig slaap, snelle sprintjes en nog lang niet klaar met dansen.',
    '/breeds/dwerg.svg',
    '#ec4899'
  )
on conflict do nothing;

-- Stage coordinates derived from the plattegrond artwork + calibrated overlay
-- corners (scripts/stages-from-plattegrond.ts). Clashfinder import matches acts
-- to stages by name — rename here if the Clashfinder stage names differ.
insert into public.stages (name, lat, lon, color, sort_order) values
  ('Bossa Nova',         51.852003, 5.690650, '#22c55e', 1),
  ('REX',                51.851521, 5.692107, '#a3a3a3', 2),
  ('Radiate VI',         51.850305, 5.694873, '#15803d', 3),
  ('Holding',            51.850837, 5.692799, '#ef4444', 4),
  ('Idyllische Veldje',  51.849697, 5.695412, '#a855f7', 5),
  ('The Croque Madame',  51.849069, 5.695958, '#ec4899', 6),
  ('Fuzzy Lop',          51.849723, 5.693748, '#eab308', 7),
  ('Teddy Widder',       51.851041, 5.688725, '#f59e0b', 8),
  ('The Bizarre',        51.848509, 5.695001, '#dc2626', 9),
  ('Hotot',              51.846665, 5.696449, '#f97316', 10)
on conflict (name) do nothing;
