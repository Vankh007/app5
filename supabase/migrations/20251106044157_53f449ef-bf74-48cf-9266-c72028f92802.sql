-- Update Popular collection with a backdrop URL
UPDATE collections 
SET backdrop_url = 'https://image.tmdb.org/t/p/original/3V4kLQg0kSqPLctI5ziYWabAZYF.jpg'
WHERE name = 'Popular';

-- Also add backdrop URLs for other collections if they don't have them
UPDATE collections 
SET backdrop_url = 'https://image.tmdb.org/t/p/original/yDHYTfA3R0jFYba16jBB1ef8oIt.jpg'
WHERE name = 'K-DRAMA' AND backdrop_url IS NULL;

UPDATE collections 
SET backdrop_url = 'https://image.tmdb.org/t/p/original/9SSEUrSqhljBMzRe4aBTh17rUaC.jpg'
WHERE name = 'C-DRAMA' AND backdrop_url IS NULL;