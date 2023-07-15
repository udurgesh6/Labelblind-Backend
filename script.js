const axios = require('axios');
const cheerio = require('cheerio');
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { MongoClient } = require('mongodb');

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: '*' }));
const port = 8080;
const mongoURL = process.env.MONGO_URL;
const client = new MongoClient(mongoURL);
let db;
async function connectToDatabase() {
  try {
    await client.connect();
    db = client.db('Labelblind');
    console.log('Connected to MongoDB');
  } catch (err) {
    console.error('Failed to connect to MongoDB', err);
    process.exit(1);
  }
}

connectToDatabase();

//Scrapping the data
app.get('/scrape', async (req, res) => {
  try {
    let response = await axios.get(decodeURI(req.query.url));
    const $ = cheerio.load(response.data);
    const spanElement = $('span.B_NuCI');
    const text = spanElement.text().trim();
    const productData = {};
    productData['name'] = text;

    $('tr._1s_Smc.row').each((index, element) => {
      const label = $(element).find('td._1hKmbr.col.col-3-12').text().trim();
      const value = $(element)
        .find('td.URwL2w.col.col-9-12 li._21lJbe')
        .text()
        .trim();
      if (label.length > 0) {
        productData[label] = value;
      }
    });

    const priceElement = $('div._30jeq3._16Jk6d');
    productData['Price'] = priceElement.text().trim();

    const imgElements = $('img.q6DClP');
    let srcArray = [];
    imgElements.each((index, element) => {
      const src = $(element).attr('src');
      srcArray.push(src);
    });
    srcArray = [...new Set(srcArray)];

    productData['Images'] = srcArray;

    const collection = db.collection('labelblind');
    collection.insertOne(productData);
  } catch (err) {
    res.sendStatus(403);
  }
});

// API endpoint for retrieving scraped data
app.get('/data', async (req, res) => {
  try {
    const collection = db.collection('labelblind');
    const data = await collection.find({}).toArray();
    res.json(data);
  } catch (err) {
    console.error('Error retrieving data:', err);
    res.status(500).send('An error occurred while retrieving data');
  }
});

// Listening
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
