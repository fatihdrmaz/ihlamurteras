const express = require('express');
const app = express();
const port = 8080;

// Statik dosyaları sunmak için
app.use(express.static('./'));

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
}); 