const mongoose = require('mongoose');

mongoose.connect(`mongodb+srv://ji:1@cluster0.y8dlgd4.mongodb.net/mera?retryWrites=true&w=majority&appName=Cluster0`);
module.exports = mongoose;
