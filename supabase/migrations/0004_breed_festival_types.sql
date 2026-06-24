-- Turn the six selectable rabbit breeds into recognizable festival types.
-- The first three also match the rabbit-named DTRH stages.

alter table public.rabbit_breeds
  add column if not exists description text not null default '';

update public.rabbit_breeds
set
  name = 'REX',
  description = 'De muzieksnob: kent elke B-kant en staat vooraan vóór de doorbraak.',
  image_url = '/breeds/rex.svg',
  marker_color = '#a3a3a3'
where lower(name) = 'rex';

update public.rabbit_breeds
set
  name = 'Fuzzy Lop',
  description = 'De vrolijke dwaalgast: volgt de groep en belandt altijd bij het beste feestje.',
  image_url = '/breeds/fuzzy-lop.svg',
  marker_color = '#eab308'
where name in ('Hangoor (Lop)', 'Fuzzy Lop');

update public.rabbit_breeds
set
  name = 'Teddy Widder',
  description = 'De knuffelraver: glitter op de wangen, armen in de lucht en vrienden overal.',
  image_url = '/breeds/teddy-widder.svg',
  marker_color = '#f59e0b'
where name in ('Leeuwenkop', 'Teddy Widder');

update public.rabbit_breeds
set
  description = 'De blokkenschemaprof: strak gepland en precies op tijd voor iedere favoriete act.',
  marker_color = '#111827'
where name = 'Hollander';

update public.rabbit_breeds
set
  description = 'Het rustpunt van de groep: bewaakt de plek en heeft altijd ruimte op het kleed.',
  marker_color = '#6b7280'
where name = 'Vlaamse Reus';

update public.rabbit_breeds
set
  description = 'De energiebom: weinig slaap, snelle sprintjes en nog lang niet klaar met dansen.',
  marker_color = '#ec4899'
where name = 'Dwergkonijn';
