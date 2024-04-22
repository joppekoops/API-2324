# API @cmda-minor-web 2023 - 2024

![A laptop with the quiz master app with a poster and an phone with four possible titles](./readme-images/mockup.webp)

## 💡 Mijn idee
Mijn concept is een quiz applicatie zoals Kahoot, maar dan met filmposters. Net als kahoot is er één quiz master en meerdere spelers. Elke vraag bestaat uit een random filmposter, waarbij het de juiste titel moet worden gekozen. Naast de juiste titel staan er nog drie andere random film titels als mogelijke antwoorden.

## 🎥 Filmtitels en -posters
De filmtitels en filmposters haal ik van [*The Movie DB API*](https://developer.themoviedb.org/reference/intro/getting-started).

### 🪫 Lege posters
Voor de quiz is het natuurlijk de bedoeling dat op de poster geen titel staat. Bij *The Movie DB* zijn er per film verschillende posters, waaronder soms ook een zonder titel. Deze is te herkennen aan dat ```poster.iso_639_1 === null```. Dit geeft de taal van de poster aan.

Eerst heb ik geprobeerd een random film via de *API* op te vragen, maar lang niet elke film blijkt een lege poster te hebben. De oplossing die ik hiervoor heb bedacht is om één keer de top 500 films op te vragen. Deze zijn bijna allemaal goed bijgehouden en hebben in ieder geval allemaal een poster waarvan ```poster.iso_639_1 === null```. Helaas zijn er nog een paar waar er dan toch tekst op staat.

```js
const movies = [];

// Get the first 26 pages from the top_rated endpoint from TMDB
for (var i = 1; i < 26; i++) {

    const url = `https://api.themoviedb.org/3/movie/top_rated?page=${i}&adult=false`;
    const options = {
        method: 'GET',
        headers: {
            accept: 'application/json',
            Authorization: 'Bearer ' + process.env.MOVIEDB_API_KEY
    	}
	};

	const response = await fetch(url, options);

	const result = await response.json();

    // Add every result to the movies array
    result.results.forEach(movie => movies.push(movie));
}
```

Vervolgens sla ik deze *array* met films op in een *json*-bestand voor later gebruik.

### 🎲 Random film
Om een random film te krijgen neem ik een random *item* uit de eerder gemaakte *array*. 

```js
// Get a random number based on the amount of movies in the list
const randomMovieId = Math.floor(Math.random() * movies.length);

// Select that movie from the list
const movie = movies[randomMovieId];
```

Vervolgens kan ik hier de poster bij zoeken door opnieuw een *request* te doen naar *The Movie DB* met het ID van de random uitgekozen film.

```js
const getMoviePoster = async (id) => {
  	try {
    	const url = `https://api.themoviedb.org/3/movie/${id}/images?adult=false`;
    	const options = {
      		method: 'GET',
      		headers: {
        		accept: 'application/json',
        		Authorization: 'Bearer ' + process.env.MOVIEDB_API_KEY
      		}
    	};

    	const response = await fetch(url, options);

    	const json = await response.json();

    	// Get the poster with no language (almost always without text)
    	const poster = json.posters.find(poster => poster.iso_639_1 === null);
    }
}

```

Al deze functionaliteiten heb ik in een **aantal verschillende functies** gezet, die de uitkomst *returnen*, voor makkelijk hergebruik:

- ```getMovies()``` geeft de top 500 films.
- ```getMoviePoster(id)``` geeft een poster terug bij een film ID.
- ```getRandomMovie()``` geeft een random film uit het ```movies.json``` bestand.