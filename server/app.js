const express = require('express');
const serverConfig = require('./src/configs/serverConfig');
const apiRouter = require('./src/routes/apiRouter');

const app = express();
serverConfig(app);

app.use('/api', apiRouter);

app.use((req, res) => {
  res.status(404).send('Not found');
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
