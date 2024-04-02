import 'dotenv/config';
import { App } from '@tinyhttp/app';
import { logger } from '@tinyhttp/logger';
import fs from 'node:fs';
import ejs from 'ejs';
import sirv from 'sirv';

const app = new App();

app.set('view engine', 'ejs');
app.engine('ejs', ejs.renderFile);

app
  .use(logger())
  .use('/', sirv('static'))
  .listen(3000);

app.get('/', (req, res) => {
    res.render('pages/index');
});