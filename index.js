const express = require('express');
let app = express();

app.get('/', express.static('views'));
app.listen(process.env.OPENSHIFT_NODEJS_PORT, process.env.OPENSHIFT_NODEJS_IP);

