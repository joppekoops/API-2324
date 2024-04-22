# API @cmda-minor-web 2023 - 2024


![Een laptop met de quiz master app met een poster en een telefoon met vier mogelijke titels](./readme-images/mockup.webp)

## Installatie
1. Clone de code
```
git clone https://github.com/joppekoops/API-2324.git
```

2. Installeer node modules
```
npm i
```

3. Voor *The Movie DB API* is een key nodig in een *env* bestand in de root.

Voorbeeld: 
```
MOVIEDB_API_KEY="key"
```

Deze kan je krijgen via https://developer.themoviedb.org/reference/intro/getting-started

4. Start de app
```
npm start
```

5. Laad nieuwe films door naar `localhost:3000/getmovies` te gaan.


## 💡 Het concept
![The Movie Poster Quiz](./readme-images/movie-poster-quiz-title.webp)
The Movie poster quiz is een quiz app waarbij meerdere spelers tegen elkaar spelen om de juiste film titel bij een poster te kiezen. Een beetje zoals Kahoot, maar dan met filmposters. Net als Kahoot is er één quiz master en meerdere spelers. Elke vraag bestaat uit een random filmposter, waarbij het de juiste titel moet worden gekozen. Naast de juiste titel staan er nog drie andere random film titels als mogelijke antwoorden.

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

Al deze functionaliteiten heb ik in een **aantal verschillende functies** gezet, die de uitkomst teruggeven, voor makkelijk hergebruik:

- ```getMovies()``` geeft de top 500 films.
- ```getMoviePoster(id)``` geeft een poster terug bij een film ID.
- ```getRandomMovie()``` geeft een random film uit het ```movies.json``` bestand.


## ⏳ ***Realtime*** data
Om zowel de quiz master als de spelers tegelijkertijd de vraag te sturen maak ik gebruik van ***server-sent events***.

De voorbeelden op MDN [(Using Server-sent Events - Web APIs | MDN, 2023)](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events) zijn helaas in *PHP*, dus heb ik met een tutorial op Digital Ocean gewerkt [(Alvarez, 2021)](https://www.digitalocean.com/community/tutorials/nodejs-server-sent-events-build-realtime-app).

Ik gebruik *server-sent events* om de verschillende *ui states* naar de gebruikers te sturen.

```js
const playerEventsHandler = (req, res) => {
  const headers = {
    'Content-Type': 'text/event-stream',
    'Connection': 'keep-alive',
    'Cache-Control': 'no-cache'
  };
  res.writeHead(200, headers);

  const clientId = req.cookies.nickname;

  const newClient = {
    id: clientId,
    res
  };

  players.push(newClient);

  req.on('close', () => {
    console.log(`${clientId} Connection closed`);
    players = players.filter(client => client.id !== clientId);
  });
}

const sendEventsToPlayers = (data) => {
  players.forEach(client => client.res.write(`data: ${JSON.stringify(data)}\n\n`))
}
```

Er zijn twee *event handlers*. Eén voor de spelers en één voor de quiz master. Met de functie ```sendEventsToPlayers()``` wordt de ingevulde data naar de spelers verstuurd. In de *front-end JavaScript* wordt vervolgens elk event ingevuld in de ```<main>```.

```js
eventSrc.onmessage = async (event) => {

	if (event.data != 'undefined') {
		const eventData = JSON.parse(event.data);
		main.innerHTML = eventData;
	}
	
}
```

## 🎮 Het spel
Nadat de losse functionaliteiten waren uitgezocht ben ik begonnen met het maken van het spel zelf. Het spel bestaat uit vijf *endpoints*:

- ```/join``` om als speler een spel te *joinen*,
- ```/player``` voor het spel als speler,
- ```/answer``` om de antwoorden te verwerken en score bij te houden,
- ```/create-quiz``` om als quiz master een quiz aan te maken en
- ```/quiz-master``` voor het spel als quiz master.

### ➕ ***Join***
![Een telefoon met het join scherm van de movie poster quiz](./readme-images/mockup_join.webp)

Het *joinen* van het spel kan met een simpel formulier, waar de speler zijn *nickname* kan invullen. Dit formulier wordt verstuurd naar ```/player```. Als de speler al bestaat, wordt daar opnieuw het formulier gerenderd met een error dat de speler al bestaat.

### 🤾 ***Player***
![Drie telefoons met drie states van de quiz. Het wachten, het aftellen en de vier mogelijke titels](./readme-images/mockup_player.webp)

Deze *route* voegt de nieuwe spelers toe aan het *scoreboard array* en geeft, wanneer de quiz start, de eerste vraag. De vraag bestaat weer uit een formulier met vier buttons, voor de mogelijke antwoorden en een aantal *hidden* velden, voor het vraagnummer en het goede antwoord.

### 💬 ***Answer***
Nadat een speler heeft geantwoord, wordt hier het antwoord vergeleken met het goede antwoord. Als die hetzelfde zijn, krijgt de speler er een punt bij in het *scoreboard array*.

```js
if (answer == correctAnswer) {
    const player = scoreboard.find(player => player.nickname == nickname); 
    player.points++;
}
```

Daarna wordt hier of de volgende vraag getoond of het *scoreboard* als de quiz is afgelopen.

### ***Create Quiz***
![Laptop met het formulier om een quiz te maken](./readme-images/mockup_create.webp)

Via deze *route* kan een quiz worden aangemaakt. Origineel zouden hier meer opties komen te staan, maar om te kunnen focussen op een goed werkende quiz, heb ik deze voor nu weg gelaten.

Opties zouden kunnen zijn:
- quiz code, om meerder quizzen tegelijkertijd te kunnen hebben en
- tijd per vraag.

### 🧑‍🏫 ***Quiz Master***
Dit is eigenlijk de belangrijkste. Vanuit hier wordt de hele quiz aangestuurd. Zodra deze *endpoint* wordt geopend start de quiz, en worden vanuit hier alle vragen naar gebruikers verstuurd. Dit gaat in een aantal stappen:

1. Dit begint bij een *for loop* die zo vaak loopt als het opgegeven aantal vragen.

	1. In de loop wordt als eerste de *countdown timer* naar de gebruikers verstuurd. Waarna er drie seconden wordt gewacht met een simpele *timer* functie.

	```js
	const timer = (time) => {
 		return new Promise(resolve => setTimeout(resolve, time));
	}
	```

	2. Hierna worden vier random films uitgekozen, waarvan er eentje als juiste wordt gekozen. Deze worden naar beide de *quiz master* en de spelers verstuurd, maar wel in een andere template. Bij de *master* zijn zowel de poster als de opties te zien, hoewel er bij de spelers alleen maar vier knoppen zijn.

2. Na de loop wordt het *scoreboard* gesorteerd en geladen met de scores van alles spelers.


## 🧑‍🔧 Gebruikte technieken

### 🎲 Randomizen van een array
Om de quiz leuk te houden, moeten de mogelijke antwoorden door elkaar gehusseld worden. Dit is niet iets wat makkelijk kan in *JavaScript*, maar na een tijdje googelen had ik een simpele oplossing gevonden:

```js
array.sort( () => .5 - Math.random() );
```
*https://stackoverflow.com/a/18650169*

Er stond een waarschuwing bij omdat het niet efficiënt zou zijn, maar dat maakte voor mij niet zo veel uit.

Later bleek, na heel vaak de quiz te hebben gespeeld (omdat ik ook niet weet welke poster van welke film is), dat het antwoord nog altijd optie 1 was.

Uiteindelijk heb ik een andere techniek gevonden: het Fisher-Yates algoritme. [(Aleti, 2022)](https://www.tutorialspoint.com/what-is-fisher-yates-shuffle-in-javascript)

Het werkt heel simpel: haal een *random item* uit de ene *array* en zet die in de ander.
```js
// Function for shuffling an array (fisher-yates)
const shuffle = (array) => {
  // copy the array to a temporary array
  let temp = [...array];
  // create a new array for returning
  let newArray = [];
  // for every item in the array pick random one, put in the new array, remove from temporary array
  for (let i = 0; i < array.length; i++) {
    const randomIndex = Math.floor(Math.random() * temp.length);
    newArray.push(temp[randomIndex]);
    temp.splice(randomIndex, 1);
  }
  return newArray;
}
```

### 🤾 Deelnemers tonen bij *master*
Voor de gebruikerservaring is goed om je naam in de quiz te zien verschijnen na het *joinen*, bovendien kan je dan zien wie er allemaal mee doet. Ik had hiervoor alle nodige data, de spelers in het *scoreboard array* en een plekje op *create quiz* pagina. Het probleem zat 'm in hoe ik de data op die plek kon krijgen.

Hiervoor heb ik een nieuwe *events endpoint* gemaakt, met een bijbehorende *eventsHandler*. De bedoeling was dat hierin de data van het *scoreboard* zou worden meegegeven. Hiervoor moest ik weten, wanneer die *array* veranderd.

Volgens [Banerjee op Medium (2021)](https://medium.com/@suvechhyabanerjee92/watch-an-object-for-changes-in-vanilla-javascript-a5f1322a4ca5) zijn hier een aantal manieren voor. De volgens mij enige juiste opties is om een *proxy* te gebruiken, daarom heb ik van de *scoreboard array* een *proxy* gemaakt. Hierin wordt elke keer als iets wordt aangepast de `updateScoreboard()` aangeroepen.

```js
// Array to keep track of the scores
let scoreboardArray = [];
// Proxy for updating scoreboard event if the scoreboard changes
let scoreboard = new Proxy(scoreboardArray, {
  set: function (target, key, value) {
    updateScoreboard();
    target[key] = value;
    return true;
  },
});
```




## ⛲️ Bronnen
- The Movie Database. (z.d.). Getting Started. https://developer.themoviedb.org/reference/intro/getting-started
- Alvarez, S. (2021, 22 maart). How To Use Server-Sent Events in Node.js to Build a Realtime App. DigitalOcean. https://www.digitalocean.com/community/tutorials/nodejs-server-sent-events-build-realtime-app
- Using server-sent events - Web APIs | MDN. (2023, 26 februari). MDN Web Docs. https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events
- Aleti, N. (2022, 23 september). What is Fisher–Yates shuffle in JavaScript? Tutorialspoint. https://www.tutorialspoint.com/what-is-fisher-yates-shuffle-in-javascript
- How to randomize (shuffle) a JavaScript array? (z.d.). Stack Overflow. https://stackoverflow.com/a/18650169
- Banerjee, S. (2021, 14 december). Watch an object for changes in Vanilla JavaScript - Suvechhya Banerjee - Medium. Medium. https://medium.com/@suvechhyabanerjee92/watch-an-object-for-changes-in-vanilla-javascript-a5f1322a4ca5