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
  .listen(process.env.PORT || 3000, () => console.log('Server running...'));


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

// Fuction for getting a poster from TMDB
const getMoviePoster = async (id) => {
  try{
    // Request all the images from a movie with specific id
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

    // Return the poster if one is found
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


// ROUTES

// Home page (not really useful)
app.get('/', (req, res) => {
    res.render('pages/index', {docTitle: 'The Movie Poster Quiz'});
});

// Status for checking values and who is connected
app.get('/status', (req, res) => res.json({players: players.length, scoreboard: scoreboard}));


// EVENT HANDLERS

// scoreboard updates event
let scoreboardWatchers = [];

const scoreboardEventsHandler = async (req, res) => {
  const headers = {
    'Content-Type': 'text/event-stream',
    'Connection': 'keep-alive',
    'Cache-Control': 'no-cache'
  };
  res.writeHead(200, headers);

  const playerListContent = await ejs.renderFile('./views/partials/player-list.ejs', {scoreboard});
  res.write(`data: ${playerListContent.replace(/\n/g, '')}\n\n`);

  const clientId = Date.now();

  const newClient = {
    id: clientId,
    res
  };

  scoreboardWatchers.push(newClient);

  req.on('close', () => {
    scoreboardWatchers = scoreboardWatchers.filter(client => client.id !== clientId);
  });
  
};

const updateScoreboard = async() => {
  const playerListContent = await ejs.renderFile('./views/partials/player-list.ejs', {scoreboard});
  scoreboardWatchers.forEach(client => client.res.write(`data: ${playerListContent.replace(/\n/g, '')}\n\n`));
}

// player events

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
  players.forEach(client => client.res.write(`data: ${data}\n\n`))
}

// masters events

let masters = [];
let mastersLastEvent; // for saving the last event to send on first request

const masterEventsHandler = (req, res) => {
  const headers = {
    'Content-Type': 'text/event-stream',
    'Connection': 'keep-alive',
    'Cache-Control': 'no-cache'
  };
  res.writeHead(200, headers);

  res.write(`data: ${mastersLastEvent}\n\n`); // send the saved event

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

// Events routes for different usecases

app.get('/events/:client', (req, res) => {
  if (req.params.client === 'player') {
    playerEventsHandler(req, res);
  } else if (req.params.client === 'master') {
    masterEventsHandler(req, res);
  } else if (req.params.client === 'playerlist') {
    scoreboardEventsHandler(req, res);
  }
});


// Routes for players

// Join form
app.get('/join', (req, res) => {
  res.render('pages/join', {docTitle: 'Join een quiz | The Movie Poster Quiz'});
});

// Game

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

// route for andding players and display first question
app.post('/player', (req, res) => {

  const nickname = req.body.nickname;

  // save nickname is a cookie
  res.cookie('nickname', nickname);
  
  if (scoreboard.some(player => player.nickname === nickname )) {
    // if player exists display error
    res.render('pages/join', { error: "Speler bestaat al", docTitle: 'Join een quiz | The Movie Poster Quiz'});
  } else {
    // add player to scoreboard and render the player page
    scoreboard.push({nickname: nickname, points: 0});
    res.render('pages/player', {docTitle: 'Quiz speler | The Movie Poster Quiz'});
  }
});

// route for checking answers, displaying next question or scoreboard
app.post('/answer', (req, res) => {
  // get the answer
  const nickname = req.cookies.nickname;
  const question = req.body.question;
  const answer = req.body.answer;
  const correctAnswer = req.body.correctAnswer;

  // give player a point if answer matches teh correct answer
  if (answer == correctAnswer) {
    const player = scoreboard.find(player => player.nickname == nickname); 
    player.points++;
  }

  // render the player page
  res.render('pages/player', {docTitle: 'Quiz speler | The Movie Poster Quiz'});

});


// Routes for master

// Create form
app.get('/create-quiz', (req, res) => {
  // for if multiple quizzes are possible
  const randomQuizCode = Math.random().toString(16).slice(10).toUpperCase();
  res.render('pages/create-quiz', {data: {quizCode: randomQuizCode}, docTitle: 'Maak een quiz | The Movie Poster Quiz'});
});

const timer = (time) => {
  return new Promise(resolve => setTimeout(resolve, time));
}

// Game (controls the actual quiz)
app.post('/quiz-master', async (req, res) => {

  // render the quiz master template
  await res.render('pages/quiz-master', {docTitle: 'Quiz | The Movie Poster Quiz'});

  // get the time for each question
  const questionTime = req.body['questions-time'] * 1000;

  // loop for the given amount of questions
  for (let i = 1; i <= req.body['questions-amount']; i++) {

    // render and send countdown template
    const countdownContent = await ejs.renderFile('./views/partials/timer.ejs', {time: 3000});

    sendEventsToPlayers(countdownContent.replace(/\n/g, ''));
    sendEventsToMaster(countdownContent.replace(/\n/g, ''));

    // wait the same amount as the countdown
    await timer(3000);

    // get the movie data
    const movies = [await getRandomMovie(req.params.id), await getRandomMovie(req.params.id), await getRandomMovie(req.params.id), await getRandomMovie(req.params.id)];
    const shuffledMovies = shuffle(movies);
    const correctMovie = movies.find(movie => movie.empty_poster !== null);

    // render and send the question template
    const questionMasterContent = await ejs.renderFile('./views/partials/master_question.ejs', {correctMovie, i, shuffledMovies, time: questionTime});

    sendEventsToMaster(questionMasterContent.replace(/\n/g, ''));

    const questionPlayerContent = await ejs.renderFile('./views/partials/player_question.ejs', {shuffledMovies, i, correctMovie});

    sendEventsToPlayers(questionPlayerContent.replace(/\n/g, ''));

    // wait
    await timer(questionTime);
  
  }

  // sort the scoreboard from highest to lowest
  scoreboard.sort((a, b) => b.points - a.points);

  // render and send the scoreboard template
  const scoreboardContent = await ejs.renderFile('./views/partials/scoreboard.ejs', {scoreboard});

  sendEventsToMaster(scoreboardContent.replace(/\n/g, ''));
  sendEventsToPlayers(scoreboardContent.replace(/\n/g, ''));

  //empty the scoreboard for the next game
  scoreboard = [];

});


// Route to test posters
app.get('/posters', async (req, res) => {
  const movie = await getRandomMovie(req.params.id);

  res.render('pages/posters', {data: movie, docTitle: 'Random poster | The Movie Poster Quiz'});

  console.log('The movie is: ' + movie.title)
});

// reroute the favicon to the png version
app.get('/favicon.ico', (req, res) => res.redirect('images/movie-poster-quiz-logo_favicon.png'));

// Route for creating/updating the movies.json
app.get('/getmovies', async(req, res) => {
  await getMovies();
  res.send('movies loaded');
});