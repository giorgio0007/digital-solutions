const cors = require('cors');
const corsConfig = require('./corsConfig');
const express = require('express');
const morgan = require('morgan');

const serverConfig = (app) => {
  app.use(morgan('dev'));
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  app.use(express.static('public'));
  app.use(cors(corsConfig));
};

module.exports = serverConfig;
