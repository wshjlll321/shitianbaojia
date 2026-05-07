const bcrypt = require('bcryptjs');
bcrypt.hash('shytian2026', 10).then(h => console.log('HASH:', h));
