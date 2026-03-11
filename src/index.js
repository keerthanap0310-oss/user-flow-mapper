const express = require('express');
const { runPipeline } = require('./service');
const { createConfig } = require('./config');
const logger = require('./utils/logger');

const app = express();
app.use(express.json());

app.post('/crawl', async (req, res) => {
  try {
    const { startUrl, maxDepth = 3, maxPages = 50, useBrowser = false, auth } = req.body;

    if (!startUrl || typeof startUrl !== 'string') {
      return res.status(400).json({ error: 'startUrl is required and must be a string' });
    }

    const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;

    if (!urlPattern.test(startUrl)) {
      return res.status(400).json({ error: 'startUrl is not a valid URL format' });
    }

    if (req.body.maxDepth !== undefined && (typeof req.body.maxDepth !== 'number' || req.body.maxDepth < 0)) {
      return res.status(400).json({ error: 'maxDepth must be a positive number' });
    }

    if (req.body.maxPages !== undefined && (typeof req.body.maxPages !== 'number' || req.body.maxPages <= 0)) {
      return res.status(400).json({ error: 'maxPages must be a number greater than 0' });
    }

    if (req.body.useBrowser !== undefined && typeof req.body.useBrowser !== 'boolean') {
      return res.status(400).json({ error: 'useBrowser must be a boolean' });
    }

    if (auth) {
      if (typeof auth !== 'object' || Array.isArray(auth)) {
        return res.status(400).json({ error: 'auth must be an object' });
      }
      if (!auth.loginUrl || typeof auth.loginUrl !== 'string') {
        return res.status(400).json({ error: 'auth.loginUrl is required and must be a string' });
      }
      if (!auth.username || typeof auth.username !== 'string') {
        return res.status(400).json({ error: 'auth.username is required and must be a string' });
      }
      if (!auth.password || typeof auth.password !== 'string') {
        return res.status(400).json({ error: 'auth.password is required and must be a string' });
      }

      if (!urlPattern.test(auth.loginUrl)) {
        return res.status(400).json({ error: 'auth.loginUrl is not a valid URL format' });
      }
    }

    const config = createConfig({
      startUrl,
      maxDepth,
      maxPages,
      useBrowser,
      auth
    });

    logger.info(`Starting crawl for ${startUrl} via HTTP endpoint`);
    const flowResult = await runPipeline(config);

    res.json(flowResult);
  } catch (error) {
    logger.error(`Error during crawl: ${error.message}`);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    logger.info(`Server listening on port ${PORT}`);
  });
}

module.exports = app;
