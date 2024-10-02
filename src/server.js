const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs-extra');
const path = require('path');

const app = express();
const PORT = 8080;

app.use(bodyParser.json());

const productsFilePath = path.join(__dirname, 'products.json');
const cartsFilePath = path.join(__dirname, 'carts.json');

// Helper functions
const readFile = async (filePath) => {
  return fs.readJson(filePath).catch(() => []);
};

const writeFile = async (filePath, data) => {
  return fs.writeJson(filePath, data);
};

// Products routes
const productsRouter = express.Router();

productsRouter.get('/', async (req, res) => {
  const { limit } = req.query;
  let products = await readFile(productsFilePath);
  if (limit) {
    products = products.slice(0, parseInt(limit));
  }
  res.json(products);
});

productsRouter.get('/:pid', async (req, res) => {
  const products = await readFile(productsFilePath);
  const product = products.find(p => p.id === req.params.pid);
  res.json(product || { error: 'Product not found' });
});

productsRouter.post('/', async (req, res) => {
  const products = await readFile(productsFilePath);
  const newProduct = { ...req.body, id: Date.now(), status: req.body.status !== undefined ? req.body.status : true };
  
  if (!newProduct.title || !newProduct.description || !newProduct.code || !newProduct.price || !newProduct.stock || !newProduct.category) {
    return res.status(400).json({ error: 'All fields except thumbnails are required.' });
  }
  
  products.push(newProduct);
  await writeFile(productsFilePath, products);
  res.status(201).json(newProduct);
});

productsRouter.put('/:pid', async (req, res) => {
  const products = await readFile(productsFilePath);
  const productIndex = products.findIndex(p => p.id === req.params.pid);
  
  if (productIndex === -1) {
    return res.status(404).json({ error: 'Product not found' });
  }
  
  const updatedProduct = { ...products[productIndex], ...req.body };
  products[productIndex] = updatedProduct;
  await writeFile(productsFilePath, products);
  res.json(updatedProduct);
});

productsRouter.delete('/:pid', async (req, res) => {
  let products = await readFile(productsFilePath);
  products = products.filter(p => p.id !== req.params.pid);
  await writeFile(productsFilePath, products);
  res.status(204).send();
});

app.use('/api/products', productsRouter);

// Carts routes
const cartsRouter = express.Router();

cartsRouter.post('/', async (req, res) => {
  const carts = await readFile(cartsFilePath);
  const newCart = { id: Date.now(), products: [] };
  carts.push(newCart);
  await writeFile(cartsFilePath, carts);
  res.status(201).json(newCart);
});

cartsRouter.get('/:cid', async (req, res) => {
  const carts = await readFile(cartsFilePath);
  const cart = carts.find(c => c.id === req.params.cid);
  res.json(cart || { error: 'Cart not found' });
});

cartsRouter.post('/:cid/product/:pid', async (req, res) => {
  const carts = await readFile(cartsFilePath);
  const products = await readFile(productsFilePath);
  
  const cart = carts.find(c => c.id === req.params.cid);
  const product = products.find(p => p.id === req.params.pid);
  
  if (!cart || !product) {
    return res.status(404).json({ error: 'Cart or Product not found' });
  }

  const existingProductIndex = cart.products.findIndex(p => p.product === req.params.pid);
  
  if (existingProductIndex >= 0) {
    cart.products[existingProductIndex].quantity += 1;
  } else {
    cart.products.push({ product: req.params.pid, quantity: 1 });
  }
  
  await writeFile(cartsFilePath, carts);
  res.json(cart);
});

app.use('/api/carts', cartsRouter);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});