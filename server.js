const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

// Apenas serve os arquivos da pasta raiz
app.use(express.static('.'));

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
