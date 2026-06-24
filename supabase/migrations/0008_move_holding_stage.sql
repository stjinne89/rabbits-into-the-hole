-- Move Holding about 105 map pixels to the right, onto the stage icon.

update public.stages
set
  lat = 51.850837,
  lon = 5.692799
where name = 'Holding';
