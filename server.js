import 'dotenv/config';
import { App } from '@tinyhttp/app';
import { logger } from '@tinyhttp/logger';
import fs from 'node:fs';
import ejs from 'ejs';
import sirv from 'sirv';
import cors from 'cors';

const app = new App();

app.set('view engine', 'ejs');
app.engine('ejs', ejs.renderFile);
app.use(cors());

const getMovies = async (req, res) => {
  try {

    const movies = [];

    for (var i = 1; i < 51; i++) {

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

      result.results.forEach(movie => movies.push(movie));
    }

    console.log(movies.length);

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

getMovies();

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

    const poster = json.posters.find(poster => poster.iso_639_1 === null);
    //const poster = json.backdrops[0];

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

    if(includeImage) {

      const poster = await getMoviePoster(json.id);

      json.empty_poster = poster;

    }

    console.log(json);

    return json;
  }
  catch (err) {
    console.error(err);
  }
}

const getLatesMovieId = async () => {
  try{
    const movie = await getMovie('latest', false);
    return movie.id;
  }
  catch (err) {
    console.error(err);
  }
}

//const latestMovieId = await getLatesMovieId();

const getRandomMovie = async () => {
  try{

    const randomMovieId = Math.floor(Math.random() * latestMovieId);

    const movie = await getMovie(randomMovieId, true);

    return movie;
  }
  catch (err) {
    console.error(err);
  }
}

app
  .use(logger())
  .use('/', sirv('static'))
  .listen(3000);

app.get('/', (req, res) => {
    res.render('pages/index');
});

app.get('/status', (req, res) => res.json({clients: clients.length}));

let clients = [];
let facts = [];

const eventsHandler = (req, res, next) => {
  const headers = {
    'Content-Type': 'text/event-stream',
    'Connection': 'keep-alive',
    'Cache-Control': 'no-cache'
  };
  res.writeHead(200, headers);

  const data = `data: ${JSON.stringify(facts)}\n\n`;

  res.write(data);

  const clientId = Date.now();

  const newClient = {
    id: clientId,
    res
  };

  clients.push(newClient);

  //setInterval(() => sendEventsToAll(),3000);

  req.on('close', () => {
    console.log(`${clientId} Connection closed`);
    clients = clients.filter(client => client.id !== clientId);
  });
}

const sendEventsToAll = () => {
  clients.forEach(client => client.res.write(`data: test\n\n`))
}

app.get('/events', eventsHandler);

app.get('/player', (req, res) => {
  res.render('pages/player');
});

app.get('/posters/', async (req, res) => {
  const movie = await getRandomMovie(req.params.id);

  res.render('pages/posters', {data: movie});
});