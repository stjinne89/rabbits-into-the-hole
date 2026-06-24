-- Replace the Hollander festival type while preserving its ID and existing
-- profile links. Start the candy competition with a clean slate.

update public.rabbit_breeds
set
  name = 'Witte van Hotot',
  description = 'De scherpe spotter: witte outfit, zwarte eyeliner en altijd als eerste bij de verborgen parel.',
  image_url = '/breeds/witte-van-hotot.svg',
  marker_color = '#374151'
where name in ('Hollander', 'Witte van Hotot');

-- Encounters are the cooldown records behind candy awards. Clearing both
-- prevents an old encounter from blocking the first new candy after reset.
delete from public.encounters;
delete from public.candies;
