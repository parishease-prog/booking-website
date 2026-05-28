const express = require('express');
const reportRoutes = require('./src/routes/report.routes');

const app = express();

console.log('Adding report routes...');
app.use(reportRoutes);

app.listen(6000, () => {
  console.log('Test server running on port 6000');
});
