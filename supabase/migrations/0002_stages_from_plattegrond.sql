-- Replace placeholder stages with positions derived from the plattegrond
-- artwork + the calibrated overlay corners (see scripts/stages-from-plattegrond.ts).
-- Safe while no acts exist yet; acts cascade-delete with their stage.

delete from public.stages;

-- Stage names match the Clashfinder timetable so imported acts attach by name.
-- Bossa Nova sits in the Eden area; Radiate VI in the Het Bos blob.
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
  ('Hotot',              51.846665, 5.696449, '#f97316', 10);
