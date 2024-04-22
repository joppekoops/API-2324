import 'dotenv/config';
import { App } from '@tinyhttp/app';
import { logger } from '@tinyhttp/logger';
import { cookieParser } from '@tinyhttp/cookie-parser';
import { urlencoded } from 'milliparsec';
import fs from 'node:fs/promises';
import ejs from 'ejs';
import sirv from 'sirv';
import cors from 'cors';

const app = new App();

app.set('view engine', 'ejs');
app.engine('ejs', ejs.renderFile);

app
  .use(logger())
  .use(cors())
  .use(urlencoded())
  .use(cookieParser())
  .use('/', sirv('static'))
  .listen(3000);

console.log('app running on port 3000');


// MOVIE FUNCTIONS

// Create a file with the 500 most popular posters
const getMovies = async (req, res) => {
  try {

    // Create array for all the movies
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

    console.log(movies.length + " movies stored");

    // Store the movies array in a json file
    fs.writeFile('./movies.json', JSON.stringify(movies), err => {
      if (err) {
        console.error(err);
      } else {
        // file written successfully
      }
    });
  }

  catch (err) {
    console.error(err);
  }
}

//getMovies();

// Fuction for getting a poster from TMDB
const getMoviePoster = async (id) => {
  try{
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

    // Return the poster is one is found
    if(poster) {
      return poster;
    } else {
      return null
    }
  }
  catch (err) {
    console.error(err);
  }
}

// Fuction for getting a single movie from TMDB
const getMovie = async (id, includeImage) => {
  try{
    const url = `https://api.themoviedb.org/3/movie/${id}?adult=false`;
    const options = {
      method: 'GET',
      headers: {
        accept: 'application/json',
        Authorization: 'Bearer ' + process.env.MOVIEDB_API_KEY
      }
    };

    const response = await fetch(url, options);

    const json = await response.json();

    // If the function is called with include image, also get the image and append it to the movie object
    if(includeImage) {

      const poster = await getMoviePoster(json.id);

      json.empty_poster = poster;

    }

    return json;
  }
  catch (err) {
    console.error(err);
  }
}

// Fuction for getting the latest movie id
const getLatesMovieId = async () => {
  try{
    const movie = await getMovie('latest', false);
    return movie.id;
  }
  catch (err) {
    console.error(err);
  }
}

// Fuction for getting a random movie from the local movies array
const getRandomMovie = async () => {
  try{

    // Read the movie list in the json file
    const movies = await JSON.parse(await fs.readFile("./movies.json"));

    // Get a random number based on the amount of movies in the list
    const randomMovieId = Math.floor(Math.random() * movies.length);

    // Select that movie from the list
    const movie = movies[randomMovieId];

    // Get the poster for that movie
    const poster = await getMoviePoster(movie.id);

    // Append the poster to the movie object
    movie.empty_poster = poster;

    return movie;
  }
  catch (err) {
    console.error(err);
  }
}


const shuffle = (array) => {
  let temp = [...array];
  let newArray = [];
  for (let i = 0; i < array.length; i++) {
    const randomIndex = Math.floor(Math.random() * temp.length);
    newArray.push(temp[randomIndex]);
    temp.splice(randomIndex, 1);
  }
  return newArray;
}


// ROUTES

app.get('/', (req, res) => {
    res.render('pages/index', {docTitle: 'The Movie Poster Quiz'});
});

app.get('/status', (req, res) => res.json({players: players.length, scoreboard: scoreboard}));

let players = [];

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

let masters = [];
let mastersLastEvent;

const masterEventsHandler = (req, res) => {
  const headers = {
    'Content-Type': 'text/event-stream',
    'Connection': 'keep-alive',
    'Cache-Control': 'no-cache'
  };
  res.writeHead(200, headers);

  res.write(`data: ${mastersLastEvent}\n\n`);

  const clientId = Date.now();

  const newClient = {
    id: clientId,
    res
  };

  masters.push(newClient);

  req.on('close', () => {
    console.log(`${clientId} Connection closed`);
    masters = masters.filter(client => client.id !== clientId);
    if (masters.length === 0) {
      scoreboard = [];
    }
  });
}

const sendEventsToMaster = (data) => {
  mastersLastEvent = data;
  masters.forEach(client => client.res.write(`data: ${data}\n\n`));
}

app.get('/events/:client', (req, res) => {
  if (req.params.client === 'player') {
    playerEventsHandler(req, res);
  } else if (req.params.client === 'master') {
    masterEventsHandler(req, res);
  }
});


// Routes for players

// Join form
app.get('/join', (req, res) => {
  res.render('pages/join', {docTitle: 'Join een quiz | The Movie Poster Quiz'});
});

// Game

let scoreboard = [];

app.post('/player', (req, res) => {

  const nickname = req.body.nickname;

  res.cookie('nickname', nickname);
  
  if (scoreboard.some(player => player.nickname === nickname )) {
    res.render('pages/join', { error: "Speler bestaat al", docTitle: 'Join een quiz | The Movie Poster Quiz'});
  } else {
    scoreboard.push({nickname: nickname, points: 0});
    res.render('pages/player', {docTitle: 'Quiz speler | The Movie Poster Quiz'});
  }
});

app.post('/answer', (req, res) => {
  const nickname = req.cookies.nickname;
  const question = req.body.question;
  const answer = req.body.answer;
  const correctAnswer = req.body.correctAnswer;

  if (answer == correctAnswer) {
    const player = scoreboard.find(player => player.nickname == nickname); 
    player.points++;
  }

  res.render('pages/player', {docTitle: 'Quiz speler | The Movie Poster Quiz'});

});


// Routes for master

// Create form
app.get('/create-quiz', (req, res) => {
  const randomQuizCode = Math.random().toString(16).slice(10).toUpperCase();
  res.render('pages/create-quiz', {data: {quizCode: randomQuizCode}, docTitle: 'Maak een quiz | The Movie Poster Quiz'});
});

const timer = (time) => {
  return new Promise(resolve => setTimeout(resolve, time));
}

// Game
app.post('/quiz-master', async (req, res) => {

  await res.render('pages/quiz-master', {docTitle: 'Quiz | The Movie Poster Quiz'});

  for (let i = 1; i <= req.body['questions-amount']; i++) {

    const countdownContent = await ejs.renderFile('./views/partials/timer.ejs', {time: 3000});

    sendEventsToPlayers(countdownContent.replace(/\n/g, ''));
    sendEventsToMaster(countdownContent.replace(/\n/g, ''));

    await timer(3000);

    const movies = [await getRandomMovie(req.params.id), await getRandomMovie(req.params.id), await getRandomMovie(req.params.id), await getRandomMovie(req.params.id)];
    const shuffledMovies = shuffle(movies);
    const correctMovie = movies.find(movie => movie.empty_poster !== null);

    const questionMasterContent = await ejs.renderFile('./views/partials/master_question.ejs', {correctMovie, i, shuffledMovies, time: 15000});

    sendEventsToMaster(questionMasterContent.replace(/\n/g, ''));

    const questionPlayerContent = await ejs.renderFile('./views/partials/player_question.ejs', {shuffledMovies, i, correctMovie});

    sendEventsToPlayers(questionPlayerContent.replace(/\n/g, ''));

    await timer(15000);
  
  }

  scoreboard.sort((a, b) => b.points - a.points);

  const scoreboardContent = await ejs.renderFile('./views/partials/scoreboard.ejs', {scoreboard});

  sendEventsToMaster(scoreboardContent.replace(/\n/g, ''));
  sendEventsToPlayers(scoreboardContent.replace(/\n/g, ''));

  scoreboard = [];

});


// Route to test posters
app.get('/posters', async (req, res) => {
  const movie = await getRandomMovie(req.params.id);

  res.render('pages/posters', {data: movie, docTitle: 'Random poster | The Movie Poster Quiz'});

  console.log('The movie is: ' + movie.title)
});

app.get('/favicon.ico', (req, res) => res.redirect('images/movie-poster-quiz-logo_favicon.png'));

app.get('/getmovies', async(req, res) => {
  await getMovies();
  res.send('movies loaded');
});